export const isStrongPassword = (password) => {
    // Returns true if the password is 8 or more characters long
    return password && password.length >= 8;
};


export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};