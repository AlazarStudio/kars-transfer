const inputDate = new Date("2025-04-22T18:00:00")

const strInputDate = inputDate.toLocaleString()      // DD.MM.YYYY, HH:MM:SS

const yearMonthDateLst = strInputDate.split(', ')[0].split('.')   //  DD.MM.YYYY, HH:MM:SS   -->   ["DD.MM.YYYY", "HH:MM:SS"]   -->   "DD.MM.YYYY"   -->   ["DD", "MM", "YYYY"] 
const time = strInputDate.split(', ')[1]  //   HH:MM:SS

const yearMonthDate = `${yearMonthDateLst[2]}-${yearMonthDateLst[1]}-${yearMonthDateLst[0]}`    // YYYY-MM-DD

const result = `${yearMonthDate}T${time}`

console.log(strInputDate)
console.log(yearMonthDateLst)
console.log(yearMonthDate)
console.log(result)