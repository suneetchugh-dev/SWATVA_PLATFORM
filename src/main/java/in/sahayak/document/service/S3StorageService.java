package in.sahayak.document.service;

import in.sahayak.document.config.StorageProperties;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class S3StorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;
    private final StorageProperties properties;
    private volatile boolean bucketChecked = false;

    public S3StorageService(S3Client s3Client, StorageProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    private void ensureBucketExists() {
        if (bucketChecked) {
            return;
        }
        synchronized (this) {
            if (bucketChecked) {
                return;
            }
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(properties.getBucket()).build());
            } catch (NoSuchBucketException e) {
                log.info("Bucket {} does not exist, creating bucket...", properties.getBucket());
                s3Client.createBucket(CreateBucketRequest.builder().bucket(properties.getBucket()).build());
            } catch (Exception e) {
                log.warn("Could not verify or create bucket {}: {}", properties.getBucket(), e.getMessage());
            }
            bucketChecked = true;
        }
    }

    @Override
    public String upload(String key, InputStream content, long contentLength, String contentType) {
        ensureBucketExists();
        PutObjectRequest putReq = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build();
        s3Client.putObject(putReq, RequestBody.fromInputStream(content, contentLength));
        log.info("Uploaded document object to S3: bucket={}, key={}", properties.getBucket(), key);
        return key;
    }

    @Override
    public byte[] download(String key) {
        GetObjectRequest getReq = GetObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .build();
        ResponseBytes<GetObjectResponse> bytes = s3Client.getObjectAsBytes(getReq);
        return bytes.asByteArray();
    }

    @Override
    public void delete(String key) {
        DeleteObjectRequest delReq = DeleteObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .build();
        s3Client.deleteObject(delReq);
        log.info("Deleted document object from S3: bucket={}, key={}", properties.getBucket(), key);
    }

    @Override
    public boolean exists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(properties.getBucket()).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.warn("Error checking existence for key {}: {}", key, e.getMessage());
            return false;
        }
    }
}
