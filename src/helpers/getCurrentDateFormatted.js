const getCurrentDateFormatted = () => {
    const currentDate = new Date();
  
    const year  = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Sumamos 1 al mes porque los meses van de 0 a 11
    const day   = currentDate.getDate().toString().padStart(2, '0');
  
    return `${year}-${month}-${day}`;
}

module.exports = getCurrentDateFormatted;