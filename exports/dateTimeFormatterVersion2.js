export const dateFormatter =(inputDate) => {

    if (typeof inputDate !== "object") return undefined

    const lst = inputDate.toLocaleDateString().split('.')     // DD.MM.YYYY -> [ "DD", "MM", "YYYY" ]
    
    const yearMonthDate = lst[2] + "-" + lst[1] + "-" + lst[0]  // -> YYYY-MM-DD
    const hour = inputDate.getHours()     
    const minute = inputDate.getMinutes()
    const second = inputDate.getSeconds()
    
    const moscowDate = {
        yearMonthDate: yearMonthDate,
        hour: hour >= 0 && hour <= 9 ? `0${hour}`: `${hour}`,
        minute: minute >= 0 && minute <= 9 ? `0${minute}`: `${minute}`,
        second: second >= 0 && second <= 9 ? `0${second}`: `${second}`,
    }
    
    return `${moscowDate["yearMonthDate"]}T${moscowDate["hour"]}:${moscowDate["minute"]}:${moscowDate["second"]}`
}