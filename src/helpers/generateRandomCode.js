function generateRandomCode(digits) {
    let code = "";
    const caracters = "0123456789";
  
    for (let i = 0; i < digits; i++) {
      const randomIndex = Math.floor(Math.random() * caracters.length);
      code += caracters.charAt(randomIndex);
    }
  
    return code;
  }
  
  module.exports = generateRandomCode;