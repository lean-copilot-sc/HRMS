import { useNavigate } from 'react-router-dom';
import { Box, Container, Button, Typography, Paper } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

const BRAND_COLOR = '#17134b';
const BRAND_ACCENT = '#2d2a72';
const BRAND_FONT_FAMILY = '"Poppins", "Segoe UI", sans-serif';

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const inputBaseStyles = {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontFamily: BRAND_FONT_FAMILY,
    fontSize: '1rem',
    padding: '14px 18px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
    '::placeholder': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    '&:focus': {
      borderColor: '#ffffff',
      boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.18)',
    },
  };
  const fieldLabelStyles = {
    fontFamily: BRAND_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.85)',
    mb: 1,
    display: 'block',
  };
  const errorTextStyles = {
    mt: 1,
    fontFamily: BRAND_FONT_FAMILY,
    fontSize: '0.85rem',
    color: '#ffb3b3',
  };
  const buttonStyles = {
    mt: 3,
    py: 1.5,
    fontSize: '1rem',
    fontFamily: BRAND_FONT_FAMILY,
    fontWeight: 600,
    backgroundColor: BRAND_COLOR,
    boxShadow: '0 14px 30px rgba(23, 19, 75, 0.28)',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#1f1c62',
      boxShadow: '0 18px 40px rgba(23, 19, 75, 0.35)',
    },
    '&:disabled': {
      backgroundColor: 'rgba(23, 19, 75, 0.55)',
      color: 'rgba(255, 255, 255, 0.8)',
    },
  };

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const result = await login(values.email, values.password);
        
        if (result.success) {
          navigate('/dashboard');
        } else {
          toast.error(result.error || 'Login failed');
        }
      } catch (err) {
        toast.error('An unexpected error occurred');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f6ff',
        px: 2,
        fontFamily: BRAND_FONT_FAMILY,
        color: BRAND_COLOR,
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, fontFamily: BRAND_FONT_FAMILY }}>
        <Paper
          elevation={10}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 24px 60px rgba(23, 19, 75, 0.35)',
            background: `linear-gradient(140deg, ${BRAND_COLOR} 0%, ${BRAND_ACCENT} 100%)`,
            fontFamily: BRAND_FONT_FAMILY,
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
              gap: 1,
              textAlign: 'center',
            }}
          >
            <img 
              src="/new_tablecloth.png" 
              alt="HRMS Logo" 
              style={{ width: 180, height: 'auto', marginBottom: 16 }}
            />
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              align="center"
              sx={{
                color: '#ffffff',
                fontFamily: BRAND_FONT_FAMILY,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Login
            </Typography>
          </Box>

          <Box component="form" onSubmit={formik.handleSubmit}>
            <Box sx={{ mt: 2 }}>
              <Typography component="label" htmlFor="email" sx={fieldLabelStyles}>
                Email
              </Typography>
              <Box
                component="input"
                type="email"
                id="email"
                name="email"
                autoFocus
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                sx={{
                  ...inputBaseStyles,
                  borderColor:
                    formik.touched.email && formik.errors.email
                      ? '#ffb3b3'
                      : 'rgba(255, 255, 255, 0.25)',
                  '&:focus': {
                    borderColor: '#ffffff',
                    boxShadow:
                      formik.touched.email && formik.errors.email
                        ? '0 0 0 3px rgba(255, 179, 179, 0.35)'
                        : '0 0 0 3px rgba(255, 255, 255, 0.18)',
                  },
                }}
              />
              {formik.touched.email && formik.errors.email && (
                <Typography sx={errorTextStyles}>{formik.errors.email}</Typography>
              )}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography component="label" htmlFor="password" sx={fieldLabelStyles}>
                Password
              </Typography>
              <Box
                component="input"
                type="password"
                id="password"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                sx={{
                  ...inputBaseStyles,
                  borderColor:
                    formik.touched.password && formik.errors.password
                      ? '#ffb3b3'
                      : 'rgba(255, 255, 255, 0.25)',
                  '&:focus': {
                    borderColor: '#ffffff',
                    boxShadow:
                      formik.touched.password && formik.errors.password
                        ? '0 0 0 3px rgba(255, 179, 179, 0.35)'
                        : '0 0 0 3px rgba(255, 255, 255, 0.18)',
                  },
                }}
              />
              {formik.touched.password && formik.errors.password && (
                <Typography sx={errorTextStyles}>{formik.errors.password}</Typography>
              )}
            </Box>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={formik.isSubmitting}
              disableElevation
              sx={buttonStyles}
            >
              {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
