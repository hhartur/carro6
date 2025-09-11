export const validateString = (str, fieldName, maxLength = 255) => {
  if (typeof str !== 'string') {
    throw new Error(`${fieldName} deve ser uma string.`);
  }
  if (str.length > maxLength) {
    throw new Error(`${fieldName} excede o tamanho máximo de ${maxLength} caracteres.`);
  }
};

export const validateNumber = (num, fieldName) => {
  if (typeof num !== 'number') {
    throw new Error(`${fieldName} deve ser um número.`);
  }
};