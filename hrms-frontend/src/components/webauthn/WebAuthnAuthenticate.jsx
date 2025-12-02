import { useState } from 'react';
import { Button } from '@mui/material';
import { startAuthentication } from '@simplewebauthn/browser';
import { toast } from 'react-toastify';
import api from '../../services/api';

const LABELS = {
  checkin: 'Check In',
  checkout: 'Check Out',
};

export default function WebAuthnAuthenticate({
  userId,
  action,
  label,
  disabled = false,
  onSuccess,
  buttonProps = {},
}) {
  const [loading, setLoading] = useState(false);
  const buttonLabel = label || LABELS[action] || 'Authenticate';
  const { onClick: _ignoredOnClick, ...restButtonProps } = buttonProps;

  const handleAuthenticate = async () => {
    if (!userId) {
      toast.error('Unable to detect the current user. Please re-login.');
      return;
    }

    setLoading(true);
    try {
      const optionsResponse = await api.post('/webauthn/auth/options', { userId });
      const options = optionsResponse.data;

      const assertion = await startAuthentication(options);

      const completionResponse = await api.post('/webauthn/auth/complete', {
        userId,
        assertionResponse: assertion,
        action,
      });

      const payload = completionResponse.data;
      toast.success(`${buttonLabel} successful!`);

      window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: payload?.record }));

      if (typeof onSuccess === 'function') {
        onSuccess(payload?.record || null, payload);
      }
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Authentication timed out or was cancelled.');
      } else {
        const message = err?.response?.data?.error || err?.message || 'Authentication failed';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={action === 'checkout' ? 'contained' : 'contained'}
      color={action === 'checkout' ? 'error' : 'success'}
      fullWidth
      disabled={loading || disabled}
      onClick={handleAuthenticate}
      {...restButtonProps}
    >
      {loading ? 'Processing…' : buttonLabel}
    </Button>
  );
}
