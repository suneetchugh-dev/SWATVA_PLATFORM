package in.sahayak.document.service;

import java.io.InputStream;

public interface StorageService {
    String upload(String key, InputStream content, long contentLength, String contentType);
    byte[] download(String key);
    void delete(String key);
    boolean exists(String key);
}
