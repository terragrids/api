export const isNumber = (number) => {
    if (isNaN(number) || typeof number !== 'number') return false
    else return true
}

export const isPositiveNumber = (number) => {
    if (isNumber(number) && number > 0) return true
    else return false
}
