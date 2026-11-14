const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpbcfnxorfqnoraqdpiq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwYmNmbnhvcmZxbm9yYXFkcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQwMjMzMiwiZXhwIjoyMTA4OTc4MzMyfQ.xJl3mRJilo5nHwJavt9m_LDBgUMeDroSJPG_Q1L4S6A';

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const vehiclesData = [
  {
    sn: 1,
    vehicle_id: 'SV-1-100',
    fleet_number: 'SV-1-100',
    plate_number: 'ب ر ع - 2579 - ERB',
    make: 'Chevrolet',
    model: 'Colorado / D-Max Pickup',
    year: 2011,
    vin: 'VIN-SV-1-100',
    driver_name: 'STANDBY NOT WORKING',
    department: 'Standby / Under Maintenance',
    location: 'Najran',
    status: 'OUT_OF_SERVICE',
    purchase_date: null,
    purchase_cost: 1,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: NA | Standby / Under Maintenance'
  },
  {
    sn: 2,
    vehicle_id: 'SV-1-101',
    fleet_number: 'SV-1-101',
    plate_number: 'ب ب ك - 3187 - KBB',
    make: 'Isuzu',
    model: 'D-Max Service Pickup',
    year: 2016,
    vin: 'VIN-SV-1-101',
    driver_name: 'John Kenneth De Guzman',
    department: 'Fuel Services / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-11-04',
    purchase_cost: 54100,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Branch1/21007'
  },
  {
    sn: 3,
    vehicle_id: 'SV-1-102',
    fleet_number: 'SV-1-102',
    plate_number: 'ب ر و - 5663 - URB',
    make: 'Isuzu',
    model: 'D-Max Service Pickup',
    year: 2016,
    vin: 'VIN-SV-1-102',
    driver_name: 'Muhammad Iqbal',
    department: 'Fuel Service / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2020-12-07',
    purchase_cost: 54000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PMT-3824'
  },
  {
    sn: 4,
    vehicle_id: 'SV-1-103',
    fleet_number: 'SV-1-103',
    plate_number: 'ح ن ص - 8673 - XNJ',
    make: 'Hyundai',
    model: 'Accent Admin Sedan',
    year: 2016,
    vin: 'VIN-SV-1-103',
    driver_name: 'Asil',
    department: 'Head Office / Finance',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-01-01',
    purchase_cost: 30000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: 2023 Purchase'
  },
  {
    sn: 5,
    vehicle_id: 'SV-1-104',
    fleet_number: 'SV-1-104',
    plate_number: 'ح ي ع - 8192 - EVJ',
    make: 'Hyundai',
    model: 'Elantra Utility Sedan',
    year: 2017,
    vin: 'VIN-SV-1-104',
    driver_name: 'Juwel Mia',
    department: 'Fuel Services / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-07-06',
    purchase_cost: 26000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PAC-Branch1/18'
  },
  {
    sn: 6,
    vehicle_id: 'SV-1-105',
    fleet_number: 'SV-1-105',
    plate_number: 'ب د ه - 9652 - HDB',
    make: 'Isuzu',
    model: 'D-Max Service Pickup',
    year: 2018,
    vin: 'VIN-SV-1-105',
    driver_name: 'Bakht Zamin',
    department: 'Fuel Services / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-12-06',
    purchase_cost: 64000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Branch1/23588'
  },
  {
    sn: 7,
    vehicle_id: 'SV-1-106',
    fleet_number: 'SV-1-106',
    plate_number: 'ب ر ب - 4498 - BRB',
    make: 'Isuzu',
    model: 'D-Max Maintenance Truck',
    year: 2018,
    vin: 'VIN-SV-1-106',
    driver_name: 'Safwat',
    department: 'Fuel Services / Maintenance',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2025-01-01',
    purchase_cost: 65000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: 2025 Purchase'
  },
  {
    sn: 8,
    vehicle_id: 'SV-1-107',
    fleet_number: 'SV-1-107',
    plate_number: 'د ص ي - 3276 - VXD',
    make: 'Hyundai',
    model: 'Elantra IT Service Car',
    year: 2018,
    vin: 'VIN-SV-1-107',
    driver_name: 'Karim Fayed',
    department: 'IT Dept. / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2021-11-16',
    purchase_cost: 33500,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PS2-98'
  },
  {
    sn: 9,
    vehicle_id: 'SV-1-108',
    fleet_number: 'SV-1-108',
    plate_number: 'ب ر د - 8097 - DRB',
    make: 'Isuzu',
    model: 'D-Max Workshop Pickup',
    year: 2019,
    vin: 'VIN-SV-1-108',
    driver_name: 'Shaikh Sarwar - Alam',
    department: 'Transport / Workshop',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2025-01-01',
    purchase_cost: 65000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: 2025 Purchase'
  },
  {
    sn: 10,
    vehicle_id: 'SV-1-109',
    fleet_number: 'SV-1-109',
    plate_number: 'ب ر ط - 8093 - TRB',
    make: 'Isuzu',
    model: 'D-Max Service Pickup',
    year: 2019,
    vin: 'VIN-SV-1-109',
    driver_name: 'Ramish Pokharel',
    department: 'Fuel Services / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2022-06-27',
    purchase_cost: 68000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PS2-423'
  },
  {
    sn: 11,
    vehicle_id: 'SV-1-110',
    fleet_number: 'SV-1-110',
    plate_number: 'د ع ي - 8041 - VED',
    make: 'Hyundai',
    model: 'Accent HR Service Car',
    year: 2020,
    vin: 'VIN-SV-1-110',
    driver_name: 'Ahmed Fayiz',
    department: 'HR Dept. / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2024-10-17',
    purchase_cost: 33000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/143'
  },
  {
    sn: 12,
    vehicle_id: 'SV-1-111',
    fleet_number: 'SV-1-111',
    plate_number: 'د ق ع - 9438 - EGD',
    make: 'Toyota',
    model: 'Hilux Finance Admin Car',
    year: 2020,
    vin: 'VIN-SV-1-111',
    driver_name: 'Youssef Al-Kazmi',
    department: 'Finance Dept. / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-01-02',
    purchase_cost: 93000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PAC-Branch2/1'
  },
  {
    sn: 13,
    vehicle_id: 'SV-1-112',
    fleet_number: 'SV-1-112',
    plate_number: 'د م ل - 7815 - LZD',
    make: 'Hyundai',
    model: 'Accent Operation Sedan',
    year: 2020,
    vin: 'VIN-SV-1-112',
    driver_name: 'Gaithan Ali Saleh Al Qarmwshi',
    department: 'Transport / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2025-06-28',
    purchase_cost: 37000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/203'
  },
  {
    sn: 14,
    vehicle_id: 'SV-1-113',
    fleet_number: 'SV-1-113',
    plate_number: 'د ل ر - 9115 - RLD',
    make: 'Hyundai',
    model: 'Accent Logistics Sedan',
    year: 2020,
    vin: 'VIN-SV-1-113',
    driver_name: 'Farid Mohammed',
    department: 'Logistics / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-07-06',
    purchase_cost: 37000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PAC-Branch1/17'
  },
  {
    sn: 15,
    vehicle_id: 'SV-1-114',
    fleet_number: 'SV-1-114',
    plate_number: 'د ك ق - 4243 - GKD',
    make: 'Toyota',
    model: 'Land Cruiser / Fortuner SUV',
    year: 2020,
    vin: 'VIN-SV-1-114',
    driver_name: 'Omar Maarabani',
    department: 'Marketing / Office',
    location: 'Dammam',
    status: 'AVAILABLE',
    purchase_date: '2024-03-07',
    purchase_cost: 145000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: NPM-Branch2/1576'
  },
  {
    sn: 16,
    vehicle_id: 'SV-1-115',
    fleet_number: 'SV-1-115',
    plate_number: 'د ع ي - 8054 - VED',
    make: 'Hyundai',
    model: 'Accent Data Control Sedan',
    year: 2020,
    vin: 'VIN-SV-1-115',
    driver_name: 'Karthik Sathaiyah',
    department: 'Data Control / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-12-03',
    purchase_cost: 33000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Branch1/23305'
  },
  {
    sn: 17,
    vehicle_id: 'SV-1-116',
    fleet_number: 'SV-1-116',
    plate_number: 'د م س - 9830 - SZD',
    make: 'Hyundai',
    model: 'Elantra Service Sedan',
    year: 2020,
    vin: 'VIN-SV-1-116',
    driver_name: 'Abdul Rahim',
    department: 'Fuel Service / Operation',
    location: 'Hail',
    status: 'AVAILABLE',
    purchase_date: '2022-01-09',
    purchase_cost: 47500,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PS2-23'
  },
  {
    sn: 18,
    vehicle_id: 'SV-1-117',
    fleet_number: 'SV-1-117',
    plate_number: 'ب ر ن - 6033 - NRB',
    make: 'Isuzu',
    model: 'D-Max Operation Pickup',
    year: 2020,
    vin: 'VIN-SV-1-117',
    driver_name: 'Almas Khan Akhbar Ali',
    department: 'Fuel Services / Operation',
    location: 'Dammam',
    status: 'AVAILABLE',
    purchase_date: '2025-01-01',
    purchase_cost: 55000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: 2025 Purchase'
  },
  {
    sn: 19,
    vehicle_id: 'SV-1-118',
    fleet_number: 'SV-1-118',
    plate_number: 'ب س س - 2431 - SSB',
    make: 'Isuzu',
    model: 'D-Max Maintenance Pickup',
    year: 2021,
    vin: 'VIN-SV-1-118',
    driver_name: 'Robert Jaime Capili',
    department: 'Fuel Services / Maintenance',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-12-03',
    purchase_cost: 65000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Branch1/23306'
  },
  {
    sn: 20,
    vehicle_id: 'SV-1-119',
    fleet_number: 'SV-1-119',
    plate_number: 'د ل ق - 9606 - GLD',
    make: 'Chevrolet',
    model: 'Captiva / Malibu Accounting Car',
    year: 2021,
    vin: 'VIN-SV-1-119',
    driver_name: 'Mohammed Sanad',
    department: 'Accounting Dept. / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2021-05-01',
    purchase_cost: 66900,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: JRN-2560'
  },
  {
    sn: 21,
    vehicle_id: 'SV-1-120',
    fleet_number: 'SV-1-120',
    plate_number: 'د ه م - 2348 - ZHD',
    make: 'Hyundai',
    model: 'Accent Operation Sedan',
    year: 2021,
    vin: 'VIN-SV-1-120',
    driver_name: 'Sami Al-Musabi',
    department: 'Fuel Services / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-12-06',
    purchase_cost: 39000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Branch1/23589'
  },
  {
    sn: 22,
    vehicle_id: 'SV-1-121',
    fleet_number: 'SV-1-121',
    plate_number: 'د ن م - 6893 - ZND',
    make: 'Hyundai',
    model: 'Accent Operation Sedan',
    year: 2021,
    vin: 'VIN-SV-1-121',
    driver_name: 'Ibrahim Ahmed',
    department: 'Fuel Service / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-07-11',
    purchase_cost: 43000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PAC-Branch1/19'
  },
  {
    sn: 23,
    vehicle_id: 'SV-1-122',
    fleet_number: 'SV-1-122',
    plate_number: 'د ن م - 6927 - ZND',
    make: 'Hyundai',
    model: 'Accent Accounting Car',
    year: 2021,
    vin: 'VIN-SV-1-122',
    driver_name: 'Mohammed Raise',
    department: 'Accounting Dept. / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2024-10-20',
    purchase_cost: 38000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/146'
  },
  {
    sn: 24,
    vehicle_id: 'SV-1-123',
    fleet_number: 'SV-1-123',
    plate_number: 'ر ح ب - 2368 - BJR',
    make: 'Suzuki',
    model: 'Carry / Dzire Office Car',
    year: 2022,
    vin: 'VIN-SV-1-123',
    driver_name: 'Haytham Ahmed Hamdok Eltom',
    department: 'Noor Khoy / Office',
    location: 'Dammam',
    status: 'AVAILABLE',
    purchase_date: '2025-06-30',
    purchase_cost: 30000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/217'
  },
  {
    sn: 25,
    vehicle_id: 'SV-1-124',
    fleet_number: 'SV-1-124',
    plate_number: 'ر ب ل - 2208 - LBR',
    make: 'Hyundai',
    model: 'Accent Office Sedan',
    year: 2022,
    vin: 'VIN-SV-1-124',
    driver_name: 'Momen Mohamed Ahmed Mohamed Othman',
    department: 'Noor Khoy / Office',
    location: 'Dammam',
    status: 'AVAILABLE',
    purchase_date: '2025-06-28',
    purchase_cost: 41000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/203'
  },
  {
    sn: 26,
    vehicle_id: 'SV-1-125',
    fleet_number: 'SV-1-125',
    plate_number: 'ب ص ن - 6174 - NXB',
    make: 'Isuzu',
    model: 'D-Max Maintenance Truck',
    year: 2022,
    vin: 'VIN-SV-1-125',
    driver_name: 'Saravana Kumar Kanan',
    department: 'Transport Maintenance',
    location: 'Dammam',
    status: 'AVAILABLE',
    purchase_date: '2023-01-31',
    purchase_cost: 71875,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PAC-Branch2/2 | Gunan Station'
  },
  {
    sn: 27,
    vehicle_id: 'SV-1-126',
    fleet_number: 'SV-1-126',
    plate_number: 'ر ب د - 2747 - DBR',
    make: 'Suzuki',
    model: 'Carry Operation Car',
    year: 2022,
    vin: 'VIN-SV-1-126',
    driver_name: 'Saddiq Mohammed',
    department: 'Noor Khoy / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2025-06-30',
    purchase_cost: 30000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/217'
  },
  {
    sn: 28,
    vehicle_id: 'SV-1-127',
    fleet_number: 'SV-1-127',
    plate_number: 'ب ط أ - 6107 - ATB',
    make: 'Toyota',
    model: 'Hilux Operation Pickup',
    year: 2023,
    vin: 'VIN-SV-1-127',
    driver_name: 'Ijaz Ahmad',
    department: 'Fuel Services / Operation',
    location: 'Dammam',
    status: 'AVAILABLE',
    purchase_date: '2023-07-19',
    purchase_cost: 110640,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: JRN-Branch1/11965'
  },
  {
    sn: 29,
    vehicle_id: 'SV-1-128',
    fleet_number: 'SV-1-128',
    plate_number: 'ر ع ل - 2565 - LER',
    make: 'Isuzu',
    model: 'D-Max Maintenance Truck',
    year: 2023,
    vin: 'VIN-SV-1-128',
    driver_name: 'Mohammad Al-Shazly',
    department: 'Maintenance / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2023-11-29',
    purchase_cost: 145600.35,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Branch1/23058'
  },
  {
    sn: 30,
    vehicle_id: 'SV-1-129',
    fleet_number: 'SV-1-129',
    plate_number: 'ب ع ق - 1212 - GEB',
    make: 'Toyota',
    model: 'Hilux HR Admin Car',
    year: 2024,
    vin: 'VIN-SV-1-129',
    driver_name: 'Hassan Mana',
    department: 'HR / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2024-11-06',
    purchase_cost: 158400,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/173'
  },
  {
    sn: 31,
    vehicle_id: 'SV-1-130',
    fleet_number: 'SV-1-130',
    plate_number: 'ب ل ه - 4326 - HLB',
    make: 'Hyundai',
    model: 'Accent Engineering Car',
    year: 2007,
    vin: 'VIN-SV-1-130',
    driver_name: 'Engr. Andrew',
    department: 'Engineering Dept',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: null,
    purchase_cost: 1,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: Engineering Staff'
  },
  {
    sn: 32,
    vehicle_id: 'SV-1-131',
    fleet_number: 'SV-1-131',
    plate_number: 'د ه ط - 9641 - DHT',
    make: 'Hyundai',
    model: 'Accent Operation Sedan',
    year: 2021,
    vin: 'VIN-SV-1-131',
    driver_name: 'Sanjay Singh',
    department: 'Fuel Services / Operation',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2026-02-15',
    purchase_cost: 34000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/57'
  },
  {
    sn: 33,
    vehicle_id: 'SV-1-132',
    fleet_number: 'SV-1-132',
    plate_number: 'ر أ ص - 9534 - RAS',
    make: 'Hyundai',
    model: 'Elantra Workshop Admin Car',
    year: 2022,
    vin: 'VIN-SV-1-132',
    driver_name: 'Eng. Rakan',
    department: 'Transport / Workshop',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2026-02-15',
    purchase_cost: 38000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/57'
  },
  {
    sn: 34,
    vehicle_id: 'SV-1-133',
    fleet_number: 'SV-1-133',
    plate_number: 'ر د و - 3582 - RDW',
    make: 'Hyundai',
    model: 'Elantra Finance Car',
    year: 2023,
    vin: 'VIN-SV-1-133',
    driver_name: 'Jihad Helmi',
    department: 'Finance Dept. / Head Office',
    location: 'Najran',
    status: 'AVAILABLE',
    purchase_date: '2026-02-15',
    purchase_cost: 40000,
    notes: 'Category: Small Vehicles | Series of 24-9-2026 | Ref: PVT-Branch2/57'
  }
];

async function runImport() {
  console.log('Starting Small Vehicles Import...');
  console.log('Total vehicle records in source dataset:', vehiclesData.length);

  // 1. Fetch existing vehicles and drivers to prevent duplicates
  const { data: existingVehicles, error: vErr } = await client
    .from('vehicles')
    .select('id, vehicle_id, plate_number');
  if (vErr) throw vErr;

  const existingVehicleIds = new Set((existingVehicles || []).map(v => v.vehicle_id));
  const existingPlates = new Set((existingVehicles || []).map(v => v.plate_number));

  const { data: existingDrivers, error: dErr } = await client
    .from('drivers')
    .select('id, full_name, employee_id');
  if (dErr) throw dErr;

  const driverMap = new Map();
  (existingDrivers || []).forEach(d => {
    driverMap.set(d.full_name.trim().toLowerCase(), d.id);
  });

  let importedCount = 0;
  let skippedCount = 0;
  const incompleteRecords = [];

  for (const item of vehiclesData) {
    if (existingVehicleIds.has(item.vehicle_id) || existingPlates.has(item.plate_number)) {
      console.log(`[SKIP DUPLICATE] Vehicle ${item.vehicle_id} (${item.plate_number}) already exists.`);
      skippedCount++;
      continue;
    }

    // Check incomplete info
    const missing = [];
    if (!item.purchase_date) missing.push('purchase_date');
    if (item.purchase_cost <= 1) missing.push('purchase_cost');
    if (item.driver_name.includes('STANDBY')) missing.push('assigned_driver');
    if (missing.length > 0) {
      incompleteRecords.push({ vehicle_id: item.vehicle_id, missing });
    }

    // Resolve or insert driver
    let driverId = null;
    if (item.driver_name && !item.driver_name.includes('STANDBY')) {
      const normDriver = item.driver_name.trim().toLowerCase();
      if (driverMap.has(normDriver)) {
        driverId = driverMap.get(normDriver);
      } else {
        const empId = 'EMP-' + item.vehicle_id.replace(/-/g, '');
        const { data: newDriver, error: ndErr } = await client
          .from('drivers')
          .insert([{
            employee_id: empId,
            full_name: item.driver_name.trim(),
            license_number: 'LIC-' + item.vehicle_id.replace(/-/g, ''),
            license_type: 'LIGHT_VEHICLE',
            license_expiry: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString(),
            phone: '+966 50 000 0000',
            status: 'ACTIVE',
            notes: 'Imported from Small Vehicles Roster (' + item.department + ')'
          }])
          .select('id')
          .single();

        if (ndErr) {
          console.warn(`[Driver Notice] Could not insert driver ${item.driver_name}:`, ndErr.message);
        } else if (newDriver) {
          driverId = newDriver.id;
          driverMap.set(normDriver, driverId);
        }
      }
    }

    // Insert vehicle
    const vehiclePayload = {
      vehicle_id: item.vehicle_id,
      fleet_number: item.fleet_number,
      plate_number: item.plate_number,
      vehicle_type: 'TRACTOR_HEAD', // Live DB enum only allows TRACTOR_HEAD currently
      make: item.make,
      model: item.model,
      year: item.year,
      vin: item.vin,
      color: 'White',
      fuel_type: 'Gasoline 95 / Diesel',
      current_mileage: 0,
      current_engine_hours: 0,
      assigned_driver_id: driverId,
      department: item.department,
      station_location: item.location,
      status: item.status,
      purchase_date: item.purchase_date,
      purchase_cost: item.purchase_cost,
      notes: item.notes
    };

    const { error: insErr } = await client.from('vehicles').insert([vehiclePayload]);
    if (insErr) {
      console.error(`[ERROR] Failed to insert ${item.vehicle_id}:`, insErr.message);
    } else {
      console.log(`[SUCCESS] Imported ${item.vehicle_id} (${item.plate_number}) - ${item.make} - ${item.driver_name}`);
      importedCount++;
      existingVehicleIds.add(item.vehicle_id);
      existingPlates.add(item.plate_number);
    }
  }

  console.log('\n=============================================');
  console.log('       IMPORT EXECUTION REPORT');
  console.log('=============================================');
  console.log(`Total records in Excel:        ${vehiclesData.length}`);
  console.log(`Successfully imported:         ${importedCount}`);
  console.log(`Duplicates skipped:            ${skippedCount}`);
  console.log(`Incomplete records noted:      ${incompleteRecords.length}`);
  console.log('=============================================\n');
}

runImport().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
