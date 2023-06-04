import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  // onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  // createUserWithEmailAndPassword,
  // signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";

// const { user, signOut, signinWithGoogle } = useAuth();
export function useAuth() {
  const auth = getAuth();
  const context = React.useContext(FirebaseUserContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a FirebaseProvider");
  }

  // TODO: link anonymous user with logged in user
  // https://firebase.google.com/docs/auth/web/anonymous-auth#convert-an-anonymous-account-to-a-permanent-account
  // firebase.auth().signInAnonymously()
  // TODO: error and loading?

  // signin buttons with svgs: https://flowbite.com/docs/components/buttons/
  return {
    user: context,
    signOut: () => signOut(auth),
    signinWithGoogle: ({ scopes, redirect = false }) => {
      const provider = new GoogleAuthProvider();

      // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
      // provider.addScope("https://www.googleapis.com/auth/youtube.upload");
      // provider.setCustomParameters({
      //   'login_hint': 'user@example.com'
      // });x
      if (scopes) scopes.forEach((scope) => provider.addScope(scope));

      if (redirect) return signInWithRedirect(auth, provider);
      else return signInWithPopup(auth, provider);
    },
    checkEmailLink: () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("firebase:email");
        if (!email)
          email = window.prompt("Please provide your email for confirmation");
        if (email)
          signInWithEmailLink(auth, email, window.location.href)
            .then((res) => {
              window.localStorage.removeItem("firebase:email");
            })
            .catch((err) => {
              alert(err.message);
            });
      }
    },
    resetPassword: ({ email, url }) => {
      // https://firebase.google.com/docs/reference/js/v8/firebase.auth.Auth#sendpasswordresetemail
      sendPasswordResetEmail(auth, email, { url, handleCodeInApp: true });
    },
    confirmPasswordReset: ({ code, password }) => {
      // https://firebase.google.com/docs/reference/js/v8/firebase.auth.Auth#confirmpasswordreset
      confirmPasswordReset({ code, newPassword: password });
    },
    signinWithEmail: ({ email, password }) => {
      // https://firebase.google.com/docs/auth/web/email-link-auth?authuser=0#send_an_authentication_link_to_the_users_email_address
      const actionCodeSettings = {
        url: document.location.href.replace(document.location.search, ""),
        handleCodeInApp: true,
      };
      if (password) {
        // https://firebase.google.com/docs/auth/web/password-auth?authuser=0
        alert("Email/password signin is unimplemented in useFirebase");
        // alert(`${email} ${password}`);
      } else {
        window.localStorage.setItem("firebase:email", email);
        sendSignInLinkToEmail(auth, email, actionCodeSettings);
      }
    },
    sendPhoneVerificationCode: ({ phoneNumber, buttonId }) => {
      if (!document.getElementById(buttonId))
        return Promise.reject(
          `sendPhoneVerificationCode cannot find element with id=${buttonId} on the page.`
        );

      if (!phoneNumber)
        return Promise.reject(
          "sendPhoneVerificationCode is missing a phoneNumber"
        );

      return new Promise((resolve, reject) => {
        window.recaptchaVerifier = new RecaptchaVerifier(
          buttonId,
          {
            size: "invisible",
            callback: (response) => {
              // console.log("recaptcha solved", response);
            },
          },
          auth
        );

        signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
          .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            resolve();
          })
          .catch((error) => {
            // reset the captcha so the user can try again
            window.recaptchaVerifier.render().then(function (widgetId) {
              grecaptcha.reset(widgetId);
            });
            reject(error);
          });
        // return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      });
    },
    signInWithPhoneNumber: ({ phoneNumber, code }) => {
      if (!window.confirmationResult)
        return Promise.reject(
          "Call sendPhoneVerificationCode({ phoneNumber, buttonId }) first."
        );
      return window.confirmationResult.confirm(code);
    },
  };
}
