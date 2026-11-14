const fs = require('fs');

const table1 = [
  { sn: 1, plate: "ب ر ع - 2579 - ERB", veh: "SV-1-100", year: 2011, make: "شيفورلية", driver: "STANDBY NOT WORKING", dept: "STANDBY / UNDER MAINTENANCE", purchase_date: "NA", cost: 1 },
  { sn: 2, plate: "ب ب ك - 3187 - KBB", veh: "SV-1-101", year: 2016, make: "ايسوزو", driver: "JOHN KENNETH DE GUZMAN", dept: "FUEL SERVICES / OPERATION / NAJRAN", purchase_date: "2023-11-04", cost: 54100 },
  { sn: 3, plate: "ب ر و - 5663 - URB", veh: "SV-1-102", year: 2016, make: "ايسوزو", driver: "MUHAMMAD IQBAL", dept: "FUEL SERVICE / OPERATION / NAJRAN", purchase_date: "2020-12-07", cost: 54000 },
  { sn: 4, plate: "ح ن ص - 8673 - XNJ", veh: "SV-1-103", year: 2016, make: "هونداي", driver: "ASIL", dept: "HEAD OFFICE / FINANCE / NAJRAN", purchase_date: "2023", cost: 30000 },
  { sn: 5, plate: "ح ي ع - 8192 - EVJ", veh: "SV-1-104", year: 2017, make: "هونداي", driver: "JUWEL MIA", dept: "FUEL SERVICES / OPERATION / NAJRAN", purchase_date: "2023-07-06", cost: 26000 },
  { sn: 6, plate: "ب د ه - 9652 - HDB", veh: "SV-1-105", year: 2018, make: "ايسوزو", driver: "BAKHT ZAMIN", dept: "FUEL SERVICES / OPERATION / NAJRAN", purchase_date: "2023-12-06", cost: 64000 },
  { sn: 7, plate: "ب ر ب - 4498 - BRB", veh: "SV-1-106", year: 2018, make: "ايسوزو", driver: "SAFWAT", dept: "FUEL SERVICES / MAINTENANCE / NAJRAN", purchase_date: "2025", cost: 65000 },
  { sn: 8, plate: "د ص ي - 3276 - VXD", veh: "SV-1-107", year: 2018, make: "هونداي", driver: "KARIM FAYED", dept: "IT DEPT. / HEAD OFFCE / NAJRAN", purchase_date: "2021-11-16", cost: 33500 },
  { sn: 9, plate: "ب ر د - 8097 - DRB", veh: "SV-1-108", year: 2019, make: "ايسوزو", driver: "SHAIKH SARWAR - ALAM", dept: "TRANSPORT / WORKSHOP / NAJRAN", purchase_date: "2025", cost: 65000 },
  { sn: 10, plate: "ب ر ط - TRB - 8093", veh: "SV-1-109", year: 2019, make: "ايسوزو", driver: "RAMISH POKHAREL", dept: "FUEL SERVICES / OPERATION / NAJRAN", purchase_date: "2022-06-27", cost: 68000 },
  { sn: 11, plate: "د ع ي - 8041 - VED", veh: "SV-1-110", year: 2020, make: "هونداي", driver: "AHMED FAYIZ", dept: "HR DEPT./ HEAD OFFICE / NAJRAN", purchase_date: "2024-10-17", cost: 33000 },
  { sn: 12, plate: "د ق ع - 9438 - EGD", veh: "SV-1-111", year: 2020, make: "تويوتا", driver: "YOUSSEF AL-KAZMI", dept: "FINANCE DEPT. / HEAD OFFICE / NAJRAN", purchase_date: "2023-01-02", cost: 93000 },
  { sn: 13, plate: "د م ل - 7815 - LZD", veh: "SV-1-112", year: 2020, make: "هونداي", driver: "GAITHAN ALI SALEH AL QARMWSHI", dept: "TRANSPORT / OPERATION / NAJRAN", purchase_date: "2025-06-28", cost: 37000 },
  { sn: 14, plate: "د ل ر - 9115 - RLD", veh: "SV-1-113", year: 2020, make: "هونداي", driver: "FARID MOHAMMED", dept: "LOGISTIC / HEAD OFFICE / NAJRAN", purchase_date: "2023-07-06", cost: 37000 },
  { sn: 15, plate: "د ك ق - 4243 - GKD", veh: "SV-1-114", year: 2020, make: "تويوتا", driver: "OMAR MAARABANI", dept: "MARKETING / OFFICE / DAMMAM", purchase_date: "2024-03-07", cost: 145000 },
  { sn: 16, plate: "د ع ي - 8054 - VED", veh: "SV-1-115", year: 2020, make: "هونداي", driver: "KARTHIK SATHAIYAH", dept: "DATA CONTROL / HEAD OFFICE / NAJRAN", purchase_date: "2023-12-03", cost: 33000 },
  { sn: 17, plate: "د م س - 9830 - SZD", veh: "SV-1-116", year: 2020, make: "هونداي", driver: "ABDUL RAHIM", dept: "FUEL SERVICE / OPERATION / HAIL", purchase_date: "2022-01-09", cost: 47500 },
  { sn: 18, plate: "ب ر ن - 6033 - NRB", veh: "SV-1-117", year: 2020, make: "ايسوزو", driver: "ALMAS KHAN AKHBAR ALI", dept: "FUEL SERVICES/ OPERATION / DAMMAM", purchase_date: "2025", cost: 421666.67 },
  { sn: 19, plate: "ب س س - 2431 - SSB", veh: "SV-1-118", year: 2021, make: "ايسوزو", driver: "ROBERT JAIME CAPILI", dept: "FUEL SERVICES / MAINTENANCE / NAJRAN", purchase_date: "2023-12-03", cost: 65000 },
  { sn: 20, plate: "د ل ق - 9606 - GLD", veh: "SV-1-119", year: 2021, make: "شيفورلية", driver: "MOHAMMED SANAD", dept: "ACCOUNTING DEPT. / HEAD OFFCE / NAJRAN", purchase_date: "2021-05-01", cost: 66900 },
  { sn: 21, plate: "د ه م - 2348 - ZHD", veh: "SV-1-120", year: 2021, make: "هونداي", driver: "SAMI AL-MUSABI", dept: "FUEL SERVICES/ OPERATION / NAJRAN", purchase_date: "2023-12-06", cost: 39000 },
  { sn: 22, plate: "د ن م - 6893 - ZND", veh: "SV-1-121", year: 2021, make: "هونداي", driver: "IBRAHIM AHMED", dept: "FUEL SERVICE / OPERATION / NAJRAN", purchase_date: "2023-07-11", cost: 43000 },
  { sn: 23, plate: "د ن م - 6927 - ZND", veh: "SV-1-122", year: 2021, make: "هونداي", driver: "MOHAMMED RAISE", dept: "ACCOUNTING DEPT. / HEAD OFFICE / NAJRAN", purchase_date: "2024-10-20", cost: 38000 },
  { sn: 24, plate: "ر ح ب - 2368 - BJR", veh: "SV-1-123", year: 2022, make: "سوزوكي", driver: "HAYTHAM AHMED HAMDOK ELTOM", dept: "NOOR KHOY / OFFICE / DAMMAM", purchase_date: "2025-06-30", cost: 30000 },
  { sn: 25, plate: "ر ب ل - 2208 - LBR", veh: "SV-1-124", year: 2022, make: "هونداي", driver: "MOMEN MOHAMED AHMED MOHAMED OTHMAN", dept: "NOOR KHOY / OFFICE / DAMMAM", purchase_date: "2025-06-28", cost: 41000 },
  { sn: 26, plate: "ب ص ن - 6174 - NXB", veh: "SV-1-125", year: 2022, make: "ايسوزو", driver: "GUNAN STATION", dept: "TRANSPORT MAINTENANCE / DAMMAM", purchase_date: "2023-01-31", cost: 71875 },
  { sn: 27, plate: "ر ب د - 2747 - DBR", veh: "SV-1-126", year: 2022, make: "سوزوكي", driver: "SADDIQ MOHAMMED", dept: "NOOR KHOY / OPERATION / NAJRAN", purchase_date: "2025-06-30", cost: 30000 },
  { sn: 28, plate: "ب ط أ - ATB - 6107", veh: "SV-1-127", year: 2023, make: "تويوتا", driver: "IJAZ AHMAD", dept: "FUEL SERVICES/ OPERATION / DAMMAM", purchase_date: "2023-07-19", cost: 110640 },
  { sn: 29, plate: "ر ع ل - 2565 -LER", veh: "SV-1-128", year: 2023, make: "ايسوزو", driver: "MOHAMMAD AL-SHAZLY", dept: "MAINTENANCE / HEAD OFFICE / NAJRAN", purchase_date: "2023-11-29", cost: 145600.35 },
  { sn: 30, plate: "ب ع ق - 1212 - GEB", veh: "SV-1-129", year: 2024, make: "تويوتا", driver: "HASSAN MANA", dept: "HR / HEAD OFFICE / NAJRAN", purchase_date: "2024-11-06", cost: 158400 },
  { sn: 31, plate: "ب ل ه - HLB - 4326", veh: "SV-1-130", year: 2007, make: "هونداي", driver: "ENGR. ANDREW", dept: "ENGINEERING DEPT / NAJRAN", purchase_date: null, cost: 1 },
  { sn: 32, plate: "DHT - 9641 - د ه ط", veh: "SV-1-131", year: 2021, make: "هونداي", driver: "SANJAY SINGH", dept: "FUEL SERVICES / OPERATION / NAJRAN", purchase_date: "2026-02-15", cost: 34000 },
  { sn: 33, plate: "RAS - 9534 - ر أ ص", veh: "SV-1-132", year: 2022, make: "هونداي", driver: "ENG. RAKAN", dept: "TRANSPORT / WORKSHOP / NAJRAN", purchase_date: "2026-02-15", cost: 38000 },
  { sn: 34, plate: "RDW - 3582 - ر د و", veh: "SV-1-133", year: 2023, make: "هونداي", driver: "JIHAD HELMI", dept: "FINANCE DEPT. / HEAD OFFCE / NAJRAN", purchase_date: "2026-02-15", cost: 40000 },
];

console.log('Total vehicles defined:', table1.length);
fs.writeFileSync('scripts/parsed_vehicles.json', JSON.stringify(table1, null, 2));
console.log('Saved to scripts/parsed_vehicles.json');
