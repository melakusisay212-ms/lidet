export type HolidayCategory = "public" | "orthodox_feast" | "saint" | "fasting" | "islamic";
export type Verification = "unverified" | "calculated" | "verified";
export type Bilingual = { en: string; am: string };

export type HolidayRule =
  | { kind: "ethiopianFixed"; month: number; day: number }
  | { kind: "gregorianFixed"; month: number; day: number }
  | { kind: "julianFixed"; month: number; day: number } // date in the Julian calendar (Orthodox church reckoning)
  | { kind: "easterOffset"; offset: number; length: number } // days from Fasika; length > 1 = period
  | { kind: "ethiopianMonthly"; day: number }
  | { kind: "weekly"; weekday: number }; // 0 = Sunday

export type HolidayRecord = {
  id: string;
  category: HolidayCategory;
  names: Bilingual;
  description: Bilingual;
  rule: HolidayRule;
  verification: Verification;
  method: "fixed_ethiopian_date" | "fixed_gregorian_date" | "julian_fixed_date" | "julian_computus" | "monthly_rule" | "weekly_rule";
  note?: Bilingual;
};

export const DATASET_VERSION = "2026.10-seed.1";
export const DATASET_LAST_UPDATED = "2026-10-10";
export const DATASET_SOURCE = "Seed data compiled by the Lidet authors. Not yet checked against official Ethiopian government or church sources.";
export const DATASET_COVERAGE: Bilingual = {
  en: "Partial coverage: selected national days, major Orthodox feasts, Abiy Tsom, weekly Wednesday/Friday fasting and three monthly commemorations. Daily saints calendar and Islamic observances are not included.",
  am: "ከፊል ሽፋን፤ የተመረጡ ብሔራዊ ቀናት፣ ዋና ዋና የኦርቶዶክስ በዓላት፣ ዐቢይ ጾም፣ ሳምንታዊ የረቡዕና አርብ ጾም እና ሦስት ወርሃዊ መታሰቢያዎች ብቻ። ዕለታዊ ስንክሳርና የእስልምና በዓላት አልተካተቱም።",
};

const dynamicNote: Bilingual = {
  en: "Calculated with the Julian-calendar Easter rule. Confirm against the church calendar for the year.",
  am: "በጁሊያን ዘመን አቆጣጠር የፋሲካ ስሌት የተሰላ። ለዓመቱ ከቤተ ክርስቲያን አቆጣጠር ጋር ያረጋግጡ።",
};
const julianNote: Bilingual = {
  en: "Defined by its Julian-calendar date, so its Ethiopian day number can shift by one in some years.",
  am: "በጁሊያን ዘመን አቆጣጠር ቀኑ የተወሰነ ስለሆነ፣ የኢትዮጵያ ቀን ቁጥሩ በአንዳንድ ዓመታት በአንድ ቀን ሊለወጥ ይችላል።",
};

export const HOLIDAYS: readonly HolidayRecord[] = [
  { id: "enkutatash", category: "public", names: { en: "Enkutatash (Ethiopian New Year)", am: "እንቁጣጣሽ" }, description: { en: "The first day of the Ethiopian year, Meskerem 1.", am: "የኢትዮጵያ አዲስ ዓመት መጀመሪያ፣ መስከረም 1።" }, rule: { kind: "ethiopianFixed", month: 1, day: 1 }, verification: "unverified", method: "fixed_ethiopian_date" },
  { id: "meskel", category: "public", names: { en: "Meskel", am: "መስቀል" }, description: { en: "Commemoration of the finding of the True Cross, Meskerem 17.", am: "የእውነተኛው መስቀል መገኘት መታሰቢያ፣ መስከረም 17።" }, rule: { kind: "ethiopianFixed", month: 1, day: 17 }, verification: "unverified", method: "fixed_ethiopian_date" },
  { id: "nations_day", category: "public", names: { en: "Nations, Nationalities and Peoples Day", am: "የብሔሮች ብሔረሰቦችና ሕዝቦች ቀን" }, description: { en: "Observed on Hidar 29.", am: "ኅዳር 29 ቀን የሚከበር።" }, rule: { kind: "ethiopianFixed", month: 3, day: 29 }, verification: "unverified", method: "fixed_ethiopian_date" },
  { id: "adwa", category: "public", names: { en: "Adwa Victory Day", am: "የአድዋ ድል በዓል" }, description: { en: "Anniversary of the Battle of Adwa, Yekatit 23.", am: "የአድዋ ጦርነት መታሰቢያ፣ የካቲት 23።" }, rule: { kind: "ethiopianFixed", month: 6, day: 23 }, verification: "unverified", method: "fixed_ethiopian_date" },
  { id: "labour_day", category: "public", names: { en: "International Labour Day", am: "የዓለም የሠራተኞች ቀን" }, description: { en: "Observed on 1 May in the Gregorian calendar.", am: "በጎርጎርዮሳዊ አቆጣጠር በሜይ 1 ቀን የሚከበር።" }, rule: { kind: "gregorianFixed", month: 5, day: 1 }, verification: "unverified", method: "fixed_gregorian_date" },
  { id: "patriots_day", category: "public", names: { en: "Patriots Victory Day", am: "የአርበኞች ድል ቀን" }, description: { en: "Observed on Miazia 27.", am: "ሚያዝያ 27 ቀን የሚከበር።" }, rule: { kind: "ethiopianFixed", month: 8, day: 27 }, verification: "unverified", method: "fixed_ethiopian_date" },
  { id: "derg_downfall", category: "public", names: { en: "Downfall of the Derg", am: "ደርግ የወደቀበት ቀን" }, description: { en: "Observed on Ginbot 20.", am: "ግንቦት 20 ቀን የሚከበር።" }, rule: { kind: "ethiopianFixed", month: 9, day: 20 }, verification: "unverified", method: "fixed_ethiopian_date" },

  { id: "genna", category: "orthodox_feast", names: { en: "Genna (Ethiopian Christmas)", am: "ገና" }, description: { en: "The Nativity of Christ, 25 December in the Julian calendar.", am: "የጌታችን የልደት በዓል፤ በጁሊያን አቆጣጠር ዲሴምበር 25 ቀን።" }, rule: { kind: "julianFixed", month: 12, day: 25 }, verification: "calculated", method: "julian_fixed_date", note: julianNote },
  { id: "timkat", category: "orthodox_feast", names: { en: "Timkat (Epiphany)", am: "ጥምቀት" }, description: { en: "Commemoration of the baptism of Christ, 6 January in the Julian calendar.", am: "የጌታችን ጥምቀት መታሰቢያ፤ በጁሊያን አቆጣጠር ጃንዩዌሪ 6 ቀን።" }, rule: { kind: "julianFixed", month: 1, day: 6 }, verification: "calculated", method: "julian_fixed_date", note: julianNote },
  { id: "hosanna", category: "orthodox_feast", names: { en: "Hosanna (Palm Sunday)", am: "ሆሣዕና" }, description: { en: "The Sunday before Fasika.", am: "ከፋሲካ በፊት ያለው እሑድ።" }, rule: { kind: "easterOffset", offset: -7, length: 1 }, verification: "calculated", method: "julian_computus", note: dynamicNote },
  { id: "siklet", category: "orthodox_feast", names: { en: "Siklet (Good Friday)", am: "ስቅለት" }, description: { en: "The Friday before Fasika, commemorating the crucifixion.", am: "ከፋሲካ በፊት ያለው ዓርብ፤ የጌታችን የስቅለት መታሰቢያ።" }, rule: { kind: "easterOffset", offset: -2, length: 1 }, verification: "calculated", method: "julian_computus", note: dynamicNote },
  { id: "fasika", category: "orthodox_feast", names: { en: "Fasika (Easter)", am: "ፋሲካ (ትንሣኤ)" }, description: { en: "The Resurrection of Christ.", am: "የጌታችን ትንሣኤ።" }, rule: { kind: "easterOffset", offset: 0, length: 1 }, verification: "calculated", method: "julian_computus", note: dynamicNote },
  { id: "ascension", category: "orthodox_feast", names: { en: "Ascension (Erget)", am: "ዕርገት" }, description: { en: "Thursday, 39 days after Fasika.", am: "ከፋሲካ በኋላ በ39ኛው ቀን የሚውለው ሐሙስ።" }, rule: { kind: "easterOffset", offset: 39, length: 1 }, verification: "calculated", method: "julian_computus", note: dynamicNote },
  { id: "pentecost", category: "orthodox_feast", names: { en: "Pentecost (Pentecoste)", am: "ጰራቅሊጦስ" }, description: { en: "Sunday, 49 days after Fasika.", am: "ከፋሲካ በኋላ በ49ኛው ቀን የሚውለው እሑድ።" }, rule: { kind: "easterOffset", offset: 49, length: 1 }, verification: "calculated", method: "julian_computus", note: dynamicNote },

  { id: "abiy_tsom", category: "fasting", names: { en: "Abiy Tsom (Great Lent)", am: "ዐቢይ ጾም" }, description: { en: "The 55-day fast before Fasika.", am: "ከፋሲካ በፊት ያለው የ55 ቀን ጾም።" }, rule: { kind: "easterOffset", offset: -55, length: 55 }, verification: "calculated", method: "julian_computus", note: dynamicNote },
  { id: "fast_wednesday", category: "fasting", names: { en: "Wednesday fast", am: "የረቡዕ ጾም" }, description: { en: "Weekly fast observed by Orthodox Tewahedo faithful.", am: "በኦርቶዶክስ ተዋሕዶ ምእመናን የሚጾም ሳምንታዊ ጾም።" }, rule: { kind: "weekly", weekday: 3 }, verification: "unverified", method: "weekly_rule", note: { en: "Seasonal exceptions are not modelled.", am: "የወቅት ልዩነቶች አልተካተቱም።" } },
  { id: "fast_friday", category: "fasting", names: { en: "Friday fast", am: "የዓርብ ጾም" }, description: { en: "Weekly fast observed by Orthodox Tewahedo faithful.", am: "በኦርቶዶክስ ተዋሕዶ ምእመናን የሚጾም ሳምንታዊ ጾም።" }, rule: { kind: "weekly", weekday: 5 }, verification: "unverified", method: "weekly_rule", note: { en: "Seasonal exceptions are not modelled.", am: "የወቅት ልዩነቶች አልተካተቱም።" } },

  { id: "monthly_michael", category: "saint", names: { en: "St. Michael (monthly)", am: "ቅዱስ ሚካኤል (ወርሃዊ)" }, description: { en: "Monthly commemoration on the 12th of each Ethiopian month.", am: "በየወሩ በ12ኛው ቀን የሚታሰብ።" }, rule: { kind: "ethiopianMonthly", day: 12 }, verification: "unverified", method: "monthly_rule" },
  { id: "monthly_mariam", category: "saint", names: { en: "Virgin Mary (monthly)", am: "ማርያም (ወርሃዊ)" }, description: { en: "Monthly commemoration on the 21st of each Ethiopian month.", am: "በየወሩ በ21ኛው ቀን የሚታሰብ።" }, rule: { kind: "ethiopianMonthly", day: 21 }, verification: "unverified", method: "monthly_rule" },
  { id: "monthly_giyorgis", category: "saint", names: { en: "St. George (monthly)", am: "ቅዱስ ጊዮርጊስ (ወርሃዊ)" }, description: { en: "Monthly commemoration on the 23rd of each Ethiopian month.", am: "በየወሩ በ23ኛው ቀን የሚታሰብ።" }, rule: { kind: "ethiopianMonthly", day: 23 }, verification: "unverified", method: "monthly_rule" },
];

export const holidayById = (id: string): HolidayRecord | undefined => HOLIDAYS.find((h) => h.id === id);
