export function getUserProperties(user) {
  if (!user) return null;

  const { uid, displayName, photoURL, email, phoneNumber, isAnonymous } = user;
  const { creationTime, lastSignInTime } = user.metadata;
  const userData = {
    uid,
    displayName,
    photoURL,
    email,
    phoneNumber,
    isAnonymous,
  };

  // if(!userData.photoURL){
  //   userData.photoURL = `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}`
  // }

  if (creationTime) userData.creationTime = new Date(creationTime);
  if (lastSignInTime) userData.lastSignInTime = new Date(lastSignInTime);

  return userData;
}
