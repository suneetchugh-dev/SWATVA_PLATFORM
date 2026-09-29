/**
 * Authentication Error Normalizer & Localizer
 * Converts raw Firebase error codes and network exceptions into clear, friendly citizen-facing messages.
 */

export function getFriendlyAuthErrorMessage(error, isHindi = false) {
  if (!error) return null;

  const raw = typeof error === 'string' ? error : (error.message || error.code || '');
  const code = error.code || '';

  // 1. Firebase Domain Authorization Error
  if (code === 'auth/unauthorized-domain' || raw.includes('unauthorized-domain')) {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'swatva.sahnirmaan.live';
    return isHindi
      ? `डोमेन प्रमाणीकरण सूचना: '${currentDomain}' अधिकृत सूची में नहीं है। आप नीचे ईमेल एवं पासवर्ड से सीधे साइन इन या पंजीकरण कर सकते हैं।`
      : `Domain Authorization Notice: '${currentDomain}' is not listed in authorized domains. You can sign in directly using Email & Password below.`;
  }

  // 2. User closed popup or cancelled
  if (
    code === 'auth/popup-closed-by-user' ||
    raw.includes('auth/popup-closed-by-user') ||
    code === 'auth/cancelled-popup-request' ||
    raw.includes('cancelled-popup-request')
  ) {
    return isHindi
      ? 'साइन-इन विंडो बंद कर दी गई थी।'
      : 'Sign-in window was closed before completing.';
  }

  // 3. Popup blocked by browser
  if (code === 'auth/popup-blocked' || raw.includes('popup-blocked')) {
    return isHindi
      ? 'ब्राउज़र ने साइन-इन पॉपअप को रोक दिया। कृपया इस साइट के लिए पॉपअप की अनुमति दें।'
      : 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
  }

  // 4. Internal / Service Error (e.g. Firebase: Error (auth/internal-error))
  if (code === 'auth/internal-error' || raw.includes('auth/internal-error') || raw.includes('internal-error')) {
    return isHindi
      ? 'प्रमाणीकरण सेवा में अस्थायी समस्या आई है। कृपया कुछ क्षणों बाद पुनः प्रयास करें।'
      : 'Authentication service encountered a temporary error. Please try again shortly.';
  }

  // 5. Network failed / server unreachable (e.g. backend offline or fetch error)
  if (
    code === 'auth/network-request-failed' ||
    raw.includes('network-request-failed') ||
    code === 'NETWORK_ERROR' ||
    raw.includes('Failed to connect') ||
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('Network Error') ||
    raw.includes('Spring Boot')
  ) {
    return isHindi
      ? 'सर्वर से संपर्क स्थापित नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें या कुछ समय बाद प्रयास करें।'
      : 'Unable to connect to the server. Please check your internet connection or try again later.';
  }

  // 6. Invalid credentials / wrong password / user not found
  if (
    code === 'auth/invalid-credential' ||
    raw.includes('auth/invalid-credential') ||
    code === 'auth/wrong-password' ||
    raw.includes('auth/wrong-password') ||
    code === 'auth/user-not-found' ||
    raw.includes('auth/user-not-found') ||
    code === 'auth/invalid-login-credentials' ||
    raw.includes('invalid-login-credentials') ||
    raw.includes('Invalid credentials')
  ) {
    return isHindi
      ? 'अमान्य ईमेल या पासवर्ड। कृपया विवरण पुनः जांचें या नया खाता बनाएं।'
      : 'Invalid email or password. Please verify your credentials or create an account.';
  }

  // 7. Email already in use
  if (code === 'auth/email-already-in-use' || raw.includes('email-already-in-use')) {
    return isHindi
      ? 'यह ईमेल पता पहले से पंजीकृत है। कृपया साइन इन करें।'
      : 'An account with this email address already exists. Please sign in instead.';
  }

  // 8. Too many attempts / rate limiting
  if (code === 'auth/too-many-requests' || raw.includes('too-many-requests')) {
    return isHindi
      ? 'अत्यधिक प्रयास किए गए हैं। सुरक्षा कारणों से कृपया थोड़ी देर बाद पुनः प्रयास करें।'
      : 'Too many attempts. For security, please wait a moment before trying again.';
  }

  // 9. Weak password
  if (code === 'auth/weak-password' || raw.includes('weak-password')) {
    return isHindi
      ? 'पासवर्ड बहुत कमजोर है। कृपया कम से कम 6 अक्षरों का प्रयोग करें।'
      : 'Password is too weak. Please use at least 6 characters.';
  }

  // 10. Invalid email address format
  if (code === 'auth/invalid-email' || raw.includes('invalid-email')) {
    return isHindi
      ? 'कृपया एक मान्य ईमेल पता दर्ज करें।'
      : 'Please enter a valid email address.';
  }

  // 11. Generic Firebase: Error (...) pattern cleanup
  if (raw.startsWith('Firebase: Error (')) {
    return isHindi
      ? 'प्रमाणीकरण में समस्या आई। कृपया विवरण जांचकर पुनः प्रयास करें।'
      : 'Authentication failed. Please verify your details and try again.';
  }

  return raw;
}
