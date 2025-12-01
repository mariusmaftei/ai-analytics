import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import styles from './AuthPage.module.css';

const GoogleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.googleIconSvg}
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7023-1.5673 2.6836-3.8741 2.6836-6.6149z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.344 0-4.3282-1.5832-5.0364-3.7105H.9573v2.3318C2.4382 15.9832 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9636 10.71c-.18-.54-.2823-1.1173-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3482 6.1732 0 7.5477 0 9s.3482 2.8268.9573 4.0418l3.0063-2.3318z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4632.8918 11.426 0 9 0 5.482 0 2.4382 2.0168.9573 4.9582L3.9636 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </g>
  </svg>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Auth functionality will be added later
    console.log('Form submitted:', formData);
  };

  const handleGoogleAuth = () => {
    // Google auth functionality will be added later
    console.log('Google auth clicked');
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome</h1>
          <p className={styles.subtitle}>
            {isLogin
              ? 'Sign in to your account'
              : 'Create a new account'}
          </p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${isLogin ? styles.active : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button
            className={`${styles.tab} ${!isLogin ? styles.active : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.label}>
                Full Name
              </label>
              <div className={styles.inputWrapper}>
                <FontAwesomeIcon
                  icon={faUser}
                  className={styles.inputIcon}
                />
                <input
                  type="text"
                  id="name"
                  name="name"
                  className={styles.input}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <div className={styles.inputWrapper}>
              <FontAwesomeIcon
                icon={faEnvelope}
                className={styles.inputIcon}
              />
              <input
                type="email"
                id="email"
                name="email"
                className={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <FontAwesomeIcon icon={faLock} className={styles.inputIcon} />
              <input
                type="password"
                id="password"
                name="password"
                className={styles.input}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <div className={styles.inputWrapper}>
                <FontAwesomeIcon icon={faLock} className={styles.inputIcon} />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className={styles.input}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {isLogin && (
            <div className={styles.forgotPassword}>
              <button type="button" className={styles.forgotLink} onClick={(e) => { e.preventDefault(); }}>
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className={styles.submitButton}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or</span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleAuth}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className={styles.footer}>
          {isLogin ? (
            <p className={styles.footerText}>
              Don't have an account?{' '}
              <button
                className={styles.footerLink}
                onClick={() => setIsLogin(false)}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className={styles.footerText}>
              Already have an account?{' '}
              <button
                className={styles.footerLink}
                onClick={() => setIsLogin(true)}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

