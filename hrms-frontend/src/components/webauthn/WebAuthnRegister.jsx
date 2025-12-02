import { useState } from 'react';
import { Button } from '@mui/material';
import { startRegistration } from '@simplewebauthn/browser';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function WebAuthnRegister({ userId, onSuccess, buttonProps = {} }) {
  const [loading, setLoading] = useState(false);
  const { onClick: _ignoredOnClick, ...restButtonProps } = buttonProps;

  const handleRegister = async () => {
    if (!userId) {
      toast.error('Unable to detect the current user. Please re-login.');
      return;
    }

    setLoading(true);
    try {
      const optionsResponse = await api.post('/webauthn/register/options', { userId });
      const options = optionsResponse.data;

      const attestation = await startRegistration(options);

      await api.post('/webauthn/register/complete', {
        userId,
        attestationResponse: attestation,
      });

      toast.success('Device registered successfully for biometric check-in!');
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Registration failed';
      if (message.includes('InvalidStateError')) {
        toast.error('This authenticator is already registered.');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      fullWidth
      disabled={loading || !userId}
      onClick={handleRegister}
      {...restButtonProps}
    >
      {loading ? 'Registering…' : 'Register Fingerprint'}
    </Button>
  );
}
