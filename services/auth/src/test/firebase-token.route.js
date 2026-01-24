import { Router } from "express";

const router = Router();

/**
 * @route GET /api/test/firebase-token
 * @description Serves HTML page to get Firebase ID token for testing
 * @access Public (Development only)
 */
router.get("/", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Firebase Token Generator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { background: #16213e; padding: 2rem; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    h1 { text-align: center; margin-bottom: 1.5rem; color: #e94560; font-size: 1.5rem; }
    .step { margin-bottom: 1.5rem; padding: 1rem; background: #0f3460; border-radius: 8px; }
    .step-title { font-weight: 600; margin-bottom: 0.75rem; color: #e94560; }
    input { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; background: #1a1a2e; color: #eee; font-size: 1rem; margin-bottom: 0.5rem; }
    input:focus { outline: 2px solid #e94560; }
    button { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; background: #e94560; color: #fff; font-size: 1rem; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    button:hover { background: #ff6b6b; }
    button:disabled { background: #555; cursor: not-allowed; }
    .token-box { background: #1a1a2e; padding: 1rem; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 0.75rem; max-height: 150px; overflow-y: auto; margin-bottom: 0.5rem; }
    .copy-btn { background: #4ecca3; }
    .copy-btn:hover { background: #3eb489; }
    .status { text-align: center; padding: 0.5rem; border-radius: 6px; margin-top: 0.5rem; }
    .success { background: #4ecca3; color: #1a1a2e; }
    .error { background: #e94560; }
    .info { background: #0f3460; font-size: 0.85rem; }
    #recaptcha-container { display: flex; justify-content: center; margin: 0.5rem 0; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Firebase Token Generator</h1>

    <div class="step">
      <div class="step-title">Step 1: Enter Phone Number</div>
      <input type="tel" id="phone" value="+911234567890" placeholder="+911234567890" />
      <div id="recaptcha-container"></div>
      <button id="sendOtpBtn" onclick="sendOTP()">Send OTP</button>
      <div id="step1Status" class="status hidden"></div>
    </div>

    <div class="step">
      <div class="step-title">Step 2: Enter OTP</div>
      <input type="text" id="otp" value="123456" placeholder="123456" maxlength="6" />
      <button id="verifyOtpBtn" onclick="verifyOTP()" disabled>Verify OTP</button>
      <div id="step2Status" class="status hidden"></div>
    </div>

    <div class="step">
      <div class="step-title">Step 3: Copy Token</div>
      <div id="tokenBox" class="token-box">Token will appear here after verification...</div>
      <button class="copy-btn" onclick="copyToken()">Copy Token</button>
      <div id="step3Status" class="status hidden"></div>
    </div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>
  <script>
    const firebaseConfig = {
      apiKey: "${process.env.FIREBASE_API_KEY}",
      authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
      projectId: "${process.env.FIREBASE_PROJECT_ID}",
      storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
      messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
      appId: "${process.env.FIREBASE_APP_ID}"
    };

    firebase.initializeApp(firebaseConfig);
    let confirmationResult = null;
    let currentToken = '';

    function showStatus(elementId, message, type) {
      const el = document.getElementById(elementId);
      el.textContent = message;
      el.className = 'status ' + type;
    }

    window.onload = () => {
      try {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'normal',
          callback: () => {
            document.getElementById('sendOtpBtn').disabled = false;
          },
          'expired-callback': () => {
            showStatus('step1Status', 'reCAPTCHA expired. Please refresh.', 'error');
          }
        });
        window.recaptchaVerifier.render();
      } catch (err) {
        showStatus('step1Status', 'reCAPTCHA init failed: ' + err.message, 'error');
      }
    };

    async function sendOTP() {
      const phone = document.getElementById('phone').value.trim();
      if (!phone) {
        showStatus('step1Status', 'Please enter phone number', 'error');
        return;
      }

      document.getElementById('sendOtpBtn').disabled = true;
      showStatus('step1Status', 'Sending OTP...', 'info');

      try {
        confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier);
        showStatus('step1Status', 'OTP sent successfully!', 'success');
        document.getElementById('verifyOtpBtn').disabled = false;
        document.getElementById('otp').focus();
      } catch (err) {
        showStatus('step1Status', 'Error: ' + err.message, 'error');
        document.getElementById('sendOtpBtn').disabled = false;
      }
    }

    async function verifyOTP() {
      const otp = document.getElementById('otp').value.trim();
      if (!otp) {
        showStatus('step2Status', 'Please enter OTP', 'error');
        return;
      }

      if (!confirmationResult) {
        showStatus('step2Status', 'Please send OTP first', 'error');
        return;
      }

      document.getElementById('verifyOtpBtn').disabled = true;
      showStatus('step2Status', 'Verifying OTP...', 'info');

      try {
        const result = await confirmationResult.confirm(otp);
        currentToken = await result.user.getIdToken();
        document.getElementById('tokenBox').textContent = currentToken;
        showStatus('step2Status', 'Verified! Token generated.', 'success');
        showStatus('step3Status', 'Click "Copy Token" to copy to clipboard', 'info');
      } catch (err) {
        showStatus('step2Status', 'Error: ' + err.message, 'error');
        document.getElementById('verifyOtpBtn').disabled = false;
      }
    }

    async function copyToken() {
      if (!currentToken) {
        showStatus('step3Status', 'No token to copy. Verify OTP first.', 'error');
        return;
      }

      try {
        await navigator.clipboard.writeText(currentToken);
        showStatus('step3Status', 'Token copied to clipboard!', 'success');
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = currentToken;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showStatus('step3Status', 'Token copied to clipboard!', 'success');
      }
    }
  </script>
</body>
</html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
