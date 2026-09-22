import { masterMetadataById } from './masterCardMetadata'
export type CardKind = 'Tamer' | 'Hoodmon' | 'Magic' | 'Trap' | 'Field' | 'Task'

export interface SeriesCard {
  id: string
  number: number
  name: string
  kind: CardKind
  family: string
  image: string
  sourceFile: string
}

const baseSeries1Cards: SeriesCard[] = [
  {
    "id": "HDM-001",
    "number": 1,
    "name": "O.D.D. Paul",
    "kind": "Tamer",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-001.webp",
    "sourceFile": "HDM-001_ODD_Paul_POLISHED_1024x1536.png"
  },
  {
    "id": "HDM-002",
    "number": 2,
    "name": "Alley Pup",
    "kind": "Hoodmon",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-002.webp",
    "sourceFile": "HDM-002_Alley_Pup_POLISHED_1024x1536.png"
  },
  {
    "id": "HDM-003",
    "number": 3,
    "name": "Bluefang Hound",
    "kind": "Hoodmon",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-003.webp",
    "sourceFile": "HDM-003_Bluefang_Hound_POLISHED_1024x1536.png"
  },
  {
    "id": "HDM-004",
    "number": 4,
    "name": "Drunk Fist Wulf",
    "kind": "Hoodmon",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-004.webp",
    "sourceFile": "HDM-004_Drunk_Fist_Wulf_POLISHED_1024x1536.png"
  },
  {
    "id": "HDM-005",
    "number": 5,
    "name": "Loyal Packmate",
    "kind": "Hoodmon",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-005.webp",
    "sourceFile": "HDM-005_Loyal_Packmate_FINAL_REVIEW_1024x1536.png"
  },
  {
    "id": "HDM-006",
    "number": 6,
    "name": "Back Alley Guardian",
    "kind": "Hoodmon",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-006.webp",
    "sourceFile": "HDM-006_Back_Alley_Guardian_CROPPED.png"
  },
  {
    "id": "HDM-007",
    "number": 7,
    "name": "Concrete Warden",
    "kind": "Hoodmon",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-007.webp",
    "sourceFile": "HDM-007_Concrete_Warden_APPROVAL.png"
  },
  {
    "id": "HDM-008",
    "number": 8,
    "name": "Corner Store Den",
    "kind": "Field",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-008.webp",
    "sourceFile": "HDM-008_Corner_Store_Den_APPROVAL.png"
  },
  {
    "id": "HDM-009",
    "number": 9,
    "name": "Good Dogs Great People",
    "kind": "Magic",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-009.webp",
    "sourceFile": "HDM-009_Good_Dogs_Great_People_APPROVAL.png"
  },
  {
    "id": "HDM-010",
    "number": 10,
    "name": "Puppy Chow Promise",
    "kind": "Task",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-010.webp",
    "sourceFile": "HDM-010_Puppy_Chow_Promise_APPROVAL.png"
  },
  {
    "id": "HDM-011",
    "number": 11,
    "name": "Corner Bowl Offering",
    "kind": "Task",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-011.webp",
    "sourceFile": "HDM-011_Corner_Bowl_Offering_APPROVAL.png"
  },
  {
    "id": "HDM-012",
    "number": 12,
    "name": "Drunken Fist Lesson",
    "kind": "Magic",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-012.webp",
    "sourceFile": "HDM-012_Drunken_Fist_Lesson_TIGHT_CROP.png"
  },
  {
    "id": "HDM-013",
    "number": 13,
    "name": "Pack Howl Rally",
    "kind": "Magic",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-013.webp",
    "sourceFile": "HDM-013_Pack_Howl_Rally_TIGHT_CROP.png"
  },
  {
    "id": "HDM-014",
    "number": 14,
    "name": "Neighborhood Watch",
    "kind": "Trap",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-014.webp",
    "sourceFile": "HDM-014_Neighborhood_Watch_TIGHT_CROP.png"
  },
  {
    "id": "HDM-015",
    "number": 15,
    "name": "Street Guardian Oath",
    "kind": "Trap",
    "family": "Neighborhood Loyalty",
    "image": "/cards/hdm-015.webp",
    "sourceFile": "HDM-015_Street_Guardian_Oath_TIGHT_CROP.png"
  },
  {
    "id": "HDM-016",
    "number": 16,
    "name": "Cinnamon",
    "kind": "Tamer",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-016.webp",
    "sourceFile": "HDM-016_Cinnamon_TIGHT_CROP.png"
  },
  {
    "id": "HDM-017",
    "number": 17,
    "name": "Squab",
    "kind": "Hoodmon",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-017.webp",
    "sourceFile": "HDM-017_Squab_TIGHT_CROP.png"
  },
  {
    "id": "HDM-018",
    "number": 18,
    "name": "Sky Rat",
    "kind": "Hoodmon",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-018.webp",
    "sourceFile": "HDM-018_Sky_Rat_TIGHT_CROP.png"
  },
  {
    "id": "HDM-019",
    "number": 19,
    "name": "Bird Brain",
    "kind": "Hoodmon",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-019.webp",
    "sourceFile": "HDM-019_Bird_Brain_TIGHT_CROP.png"
  },
  {
    "id": "HDM-020",
    "number": 20,
    "name": "Block Pigeon",
    "kind": "Hoodmon",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-020.webp",
    "sourceFile": "HDM-020_Block_Pigeon_TIGHT_CROP.png"
  },
  {
    "id": "HDM-021",
    "number": 21,
    "name": "Rooftop Bully",
    "kind": "Hoodmon",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-021.webp",
    "sourceFile": "HDM-021_Rooftop_Bully_TIGHT_CROP.png"
  },
  {
    "id": "HDM-022",
    "number": 22,
    "name": "Same Block Different Generation",
    "kind": "Task",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-022.webp",
    "sourceFile": "HDM-022_Same_Block_Different_Generation_TIGHT_CROP.png"
  },
  {
    "id": "HDM-023",
    "number": 23,
    "name": "Neighborhood WiFi",
    "kind": "Field",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-023.webp",
    "sourceFile": "HDM-023_Neighborhood_WiFi_TIGHT_CROP.png"
  },
  {
    "id": "HDM-024",
    "number": 24,
    "name": "Birds Eye Backdoor",
    "kind": "Magic",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-024.webp",
    "sourceFile": "HDM-024_Birds_Eye_Backdoor_TIGHT_CROP.png"
  },
  {
    "id": "HDM-025",
    "number": 25,
    "name": "Good Neighbors Share Passwords",
    "kind": "Magic",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-025.webp",
    "sourceFile": "HDM-025_Good_Neighbors_Share_Passwords_TIGHT_CROP.png"
  },
  {
    "id": "HDM-026",
    "number": 26,
    "name": "Dont Touch That Camera",
    "kind": "Trap",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-026.webp",
    "sourceFile": "HDM-026_Dont_Touch_That_Camera_TIGHT_CROP.png"
  },
  {
    "id": "HDM-027",
    "number": 27,
    "name": "Pigeon Grade Cybersecurity",
    "kind": "Magic",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-027.webp",
    "sourceFile": "HDM-027_Pigeon_Grade_Cybersecurity_TIGHT_CROP.png"
  },
  {
    "id": "HDM-028",
    "number": 28,
    "name": "Check on the Block",
    "kind": "Task",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-028.webp",
    "sourceFile": "HDM-028_Check_on_the_Block_CURRENT.webp"
  },
  {
    "id": "HDM-029",
    "number": 29,
    "name": "Everybody Eats",
    "kind": "Task",
    "family": "Ditsy Surveillance",
    "image": "/cards/hdm-029.webp",
    "sourceFile": "HDM-029_Everybody_Eats_TIGHT_CROP.png"
  },
  {
    "id": "HDM-030",
    "number": 30,
    "name": "Peaches",
    "kind": "Tamer",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-030.webp",
    "sourceFile": "HDM-030_Peaches_TIGHT_CROP.png"
  },
  {
    "id": "HDM-031",
    "number": 31,
    "name": "Puppy",
    "kind": "Hoodmon",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-031.webp",
    "sourceFile": "HDM-031_Puppy_APPROVED_SHEET_2026-09-21.png"
  },
  {
    "id": "HDM-032",
    "number": 32,
    "name": "Brawler",
    "kind": "Hoodmon",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-032.webp",
    "sourceFile": "HDM-032_Brawler_APPROVED_SHEET_2026-09-21.png"
  },
  {
    "id": "HDM-033",
    "number": 33,
    "name": "Redline",
    "kind": "Hoodmon",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-033.webp",
    "sourceFile": "HDM-033_Redline_APPROVED_SHEET_2026-09-21.png"
  },
  {
    "id": "HDM-034",
    "number": 34,
    "name": "Chainjaw Pup",
    "kind": "Hoodmon",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-034.webp",
    "sourceFile": "HDM-034_Chainjaw_Pup_APPROVED_SHEET_2026-09-21.png"
  },
  {
    "id": "HDM-035",
    "number": 35,
    "name": "Velvet Mauler",
    "kind": "Hoodmon",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-035.webp",
    "sourceFile": "HDM-035_Velvet_Mauler_APPROVED_SHEET_2026-09-21.png"
  },
  {
    "id": "HDM-036",
    "number": 36,
    "name": "I Know My Worth",
    "kind": "Magic",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-036.webp",
    "sourceFile": "HDM-036_I_Know_My_Worth_APPROVED_SHEET_2026-09-21.png"
  },
  {
    "id": "HDM-037",
    "number": 37,
    "name": "Iron Jaw Lock",
    "kind": "Magic",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-037.webp",
    "sourceFile": "HDM-037_Iron_Jaw_Lock_TIGHT_CROP.png"
  },
  {
    "id": "HDM-038",
    "number": 38,
    "name": "Pretty Girls Raise Monsters",
    "kind": "Magic",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-038.webp",
    "sourceFile": "HDM-038_Pretty_Girls_Raise_Monsters_TIGHT_CROP.png"
  },
  {
    "id": "HDM-039",
    "number": 39,
    "name": "Off the Leash",
    "kind": "Magic",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-039.webp",
    "sourceFile": "HDM-039_Off_The_Leash_TIGHT_CROP.png"
  },
  {
    "id": "HDM-040",
    "number": 40,
    "name": "Bad Idea, Babe",
    "kind": "Trap",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-040.webp",
    "sourceFile": "HDM-040_Bad_Idea_Babe_TIGHT_CROP.png"
  },
  {
    "id": "HDM-041",
    "number": 41,
    "name": "Chain Break Counter",
    "kind": "Trap",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-041.webp",
    "sourceFile": "HDM-041_Chain_Break_Counter_TIGHT_CROP.png"
  },
  {
    "id": "HDM-042",
    "number": 42,
    "name": "Velvet Block Kennel",
    "kind": "Field",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-042.webp",
    "sourceFile": "HDM-042_Velvet_Block_Kennel_TIGHT_CROP.png"
  },
  {
    "id": "HDM-043",
    "number": 43,
    "name": "Cash In When It Counts",
    "kind": "Task",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-043.webp",
    "sourceFile": "HDM-043_Cash_In_When_It_Counts_BOTTOM_CROPPED_v2.png"
  },
  {
    "id": "HDM-044",
    "number": 44,
    "name": "Walk Him Down",
    "kind": "Task",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-044.webp",
    "sourceFile": "HDM-044_Walk_Him_Down_SERIES_NUMBER_FINAL_INSET.png"
  },
  {
    "id": "HDM-045",
    "number": 45,
    "name": "Street Contract",
    "kind": "Magic",
    "family": "Peaches / Pit Bull",
    "image": "/cards/hdm-045.webp",
    "sourceFile": "HDM-045_Street_Contract_SERIES_NUMBER_FIXED.png"
  },
  {
    "id": "HDM-046",
    "number": 46,
    "name": "Cherry Banks",
    "kind": "Tamer",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-046.webp",
    "sourceFile": "HDM-046_Cherry_Banks_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-047",
    "number": 47,
    "name": "Kitten",
    "kind": "Hoodmon",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-047.webp",
    "sourceFile": "HDM-047_Kitten_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-048",
    "number": 48,
    "name": "Shadowcat",
    "kind": "Hoodmon",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-048.webp",
    "sourceFile": "HDM-048_Shadowcat_REBUILT_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-049",
    "number": 49,
    "name": "Miso",
    "kind": "Hoodmon",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-049.webp",
    "sourceFile": "HDM-049_Miso_ORIGINAL_STYLE_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-050",
    "number": 50,
    "name": "Velvet Paw Scout",
    "kind": "Hoodmon",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-050.webp",
    "sourceFile": "HDM-050_Velvet_Paw_Scout_ORIGINAL_STYLE_REBUILT_CROPPED.png"
  },
  {
    "id": "HDM-051",
    "number": 51,
    "name": "Moonlit Hideout",
    "kind": "Field",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-051.webp",
    "sourceFile": "HDM-051_Moonlit_Hideout_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-052",
    "number": 52,
    "name": "Silent Claws",
    "kind": "Magic",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-052.webp",
    "sourceFile": "HDM-052_Silent_Claws_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-053",
    "number": 53,
    "name": "Shadow Step",
    "kind": "Magic",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-053.webp",
    "sourceFile": "HDM-053_Shadow_Step_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-054",
    "number": 54,
    "name": "Rooftop Informant",
    "kind": "Hoodmon",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-054.webp",
    "sourceFile": "HDM-054_Rooftop_Informant_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-055",
    "number": 55,
    "name": "Marked for Midnight",
    "kind": "Task",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-055.webp",
    "sourceFile": "HDM-055_Marked_For_Midnight_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-056",
    "number": 56,
    "name": "Smoke Screen Alibi",
    "kind": "Trap",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-056.webp",
    "sourceFile": "HDM-056_Smoke_Screen_Alibi_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-057",
    "number": 57,
    "name": "Nine Lives Escape",
    "kind": "Trap",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-057.webp",
    "sourceFile": "HDM-057_Nine_Lives_Escape_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-058",
    "number": 58,
    "name": "Dead Drop Message",
    "kind": "Task",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-058.webp",
    "sourceFile": "HDM-058_Dead_Drop_Message_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-059",
    "number": 59,
    "name": "Blackmail File",
    "kind": "Magic",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-059.webp",
    "sourceFile": "HDM-059_Blackmail_File_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-060",
    "number": 60,
    "name": "Perfect Getaway",
    "kind": "Trap",
    "family": "Cherry / Cat",
    "image": "/cards/hdm-060.webp",
    "sourceFile": "HDM-060_Perfect_Getaway_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-061",
    "number": 61,
    "name": "Leaked Evidence",
    "kind": "Magic",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-061.webp",
    "sourceFile": "HDM-061_Leaked_Evidence_REBUILT_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-062",
    "number": 62,
    "name": "Data Snatch",
    "kind": "Task",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-062.webp",
    "sourceFile": "HDM-062_Data_Snatch_RULES_LEGAL_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-063",
    "number": 63,
    "name": "Tax Rell",
    "kind": "Tamer",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-063.webp",
    "sourceFile": "HDM-063_Tax_Rell_APPROVED.png"
  },
  {
    "id": "HDM-064",
    "number": 64,
    "name": "Mistling",
    "kind": "Hoodmon",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-064.webp",
    "sourceFile": "HDM-064_Mistling_ORIGINAL_STYLE_RULES_SYNC_CROPPED.png"
  },
  {
    "id": "HDM-065",
    "number": 65,
    "name": "Vaporgeck",
    "kind": "Hoodmon",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-065.webp",
    "sourceFile": "HDM-065_Vaporgeck_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-066",
    "number": 66,
    "name": "Nebulizard",
    "kind": "Hoodmon",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-066.webp",
    "sourceFile": "HDM-066_Nebulizard_CORRECTED_STAGE2_CROPPED_MASTER.png"
  },
  {
    "id": "HDM-067",
    "number": 67,
    "name": "Rooftop Condensation",
    "kind": "Field",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-067.webp",
    "sourceFile": "HDM-067_Rooftop_Condensation_ORIGINAL_TEXT.png"
  },
  {
    "id": "HDM-068",
    "number": 68,
    "name": "Dewdrop Cache",
    "kind": "Task",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-068.webp",
    "sourceFile": "HDM-068_Dewdrop_Cache_REVIEW.png"
  },
  {
    "id": "HDM-069",
    "number": 69,
    "name": "SPOTLET",
    "kind": "Hoodmon",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-069.webp",
    "sourceFile": "HDM-069_SPOTLET.png"
  },
  {
    "id": "HDM-070",
    "number": 70,
    "name": "Vapor Cache",
    "kind": "Magic",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-070.webp",
    "sourceFile": "HDM-070_VAPOR_CACHE(1).png"
  },
  {
    "id": "HDM-071",
    "number": 71,
    "name": "Gecko Ambush",
    "kind": "Magic",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-071.webp",
    "sourceFile": "HDM-071_Gecko_Ambush_REVIEW.png"
  },
  {
    "id": "HDM-072",
    "number": 72,
    "name": "Mist Network",
    "kind": "Trap",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-072.webp",
    "sourceFile": "HDM-072_Mist_Network_REVIEW.png"
  },
  {
    "id": "HDM-073",
    "number": 73,
    "name": "Smokescreen Slip",
    "kind": "Trap",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-073.webp",
    "sourceFile": "HDM-073_Smokescreen_Slip_SERIES_FIXED_CLEAN.png"
  },
  {
    "id": "HDM-074",
    "number": 74,
    "name": "Urban Mist Network",
    "kind": "Field",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-074.webp",
    "sourceFile": "HDM-074_Urban_Mist_Network_SERIES_FIXED_CLEAN.png"
  },
  {
    "id": "HDM-075",
    "number": 75,
    "name": "Mist Map",
    "kind": "Magic",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-075.webp",
    "sourceFile": "HDM-075_Mist_Map_RULES_FIXED_CROPPED.png"
  },
  {
    "id": "HDM-076",
    "number": 76,
    "name": "Tiny Creatures, Bigger Moves",
    "kind": "Task",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-076.webp",
    "sourceFile": "HDM-076_Tiny_Creatures_Bigger_Moves_RULES_FIXED_CROPPED.png"
  },
  {
    "id": "HDM-077",
    "number": 77,
    "name": "What You Dont See Obeys",
    "kind": "Trap",
    "family": "Tax Rell / Mist Network",
    "image": "/cards/hdm-077.webp",
    "sourceFile": "HDM-077_What_You_Dont_See_Obeys_RULES_FIXED_CROPPED.png"
  },
  {
    "id": "HDM-078",
    "number": 78,
    "name": "Capin MDH",
    "kind": "Tamer",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-078.webp",
    "sourceFile": "HDM-078_Capin_MDH_RULES_FIXED_CROPPED.png"
  },
  {
    "id": "HDM-079",
    "number": 79,
    "name": "KitKlaws",
    "kind": "Hoodmon",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-079.webp",
    "sourceFile": "HDM-079_Kitklaws_MONICAL_EVO_LINE_CROPPED.png"
  },
  {
    "id": "HDM-080",
    "number": 80,
    "name": "Scratchwiser",
    "kind": "Hoodmon",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-080.webp",
    "sourceFile": "HDM-080_Scratchwiser_MONICAL_EVO_LINE_CROPPED.png"
  },
  {
    "id": "HDM-081",
    "number": 81,
    "name": "Calicore",
    "kind": "Hoodmon",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-081.webp",
    "sourceFile": "HDM-081_Calicore_MONICAL_EVO_LINE_CROPPED.png"
  },
  {
    "id": "HDM-082",
    "number": 82,
    "name": "Monical",
    "kind": "Hoodmon",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-082.webp",
    "sourceFile": "HDM-082_Monical_EVOLUTION_LINE_FIXED_CROPPED.png"
  },
  {
    "id": "HDM-083",
    "number": 83,
    "name": "Hoodmon Truth Network",
    "kind": "Field",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-083.webp",
    "sourceFile": "HDM-083_Hoodmon_Truth_Network_EDITED_CROPPED.png"
  },
  {
    "id": "HDM-084",
    "number": 84,
    "name": "Data Over Fear",
    "kind": "Magic",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-084.webp",
    "sourceFile": "HDM-084_Data_Over_Fear_EDITED_CROPPED.png"
  },
  {
    "id": "HDM-085",
    "number": 85,
    "name": "Research, Record, Reveal!",
    "kind": "Task",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-085.webp",
    "sourceFile": "HDM-085_Research_Record_Reveal_CLEAN_REBUILD.png"
  },
  {
    "id": "HDM-086",
    "number": 86,
    "name": "Signal Intercept",
    "kind": "Trap",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-086.webp",
    "sourceFile": "HDM-086_Signal_Intercept_CLEAN_REBUILD.png"
  },
  {
    "id": "HDM-087",
    "number": 87,
    "name": "Field Notes Archive",
    "kind": "Magic",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-087.webp",
    "sourceFile": "HDM-087_Field_Notes_Archive_RULES_CORRECTED_CROPPED.png"
  },
  {
    "id": "HDM-088",
    "number": 88,
    "name": "Eyewitness Report",
    "kind": "Magic",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-088.webp",
    "sourceFile": "HDM-088_Eyewitness_Report_RULES_CORRECTED_CROPPED.png"
  },
  {
    "id": "HDM-089",
    "number": 89,
    "name": "Hidden Pattern Decode",
    "kind": "Magic",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-089.webp",
    "sourceFile": "HDM-089_Hidden_Pattern_Decode_FINAL_RULES_CLEAN.png"
  },
  {
    "id": "HDM-090",
    "number": 90,
    "name": "On Air Tonight",
    "kind": "Field",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-090.webp",
    "sourceFile": "HDM-090_On_Air_Tonight_FINAL_RULES_CLEAN.png"
  },
  {
    "id": "HDM-091",
    "number": 91,
    "name": "Expose the Cover-Up",
    "kind": "Trap",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-091.webp",
    "sourceFile": "HDM-091_HEADER_CLEAN_FINAL.png"
  },
  {
    "id": "HDM-092",
    "number": 92,
    "name": "Oracle's Data Stream",
    "kind": "Magic",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-092.webp",
    "sourceFile": "HDM-092_HEADER_CLEAN_FINAL.png"
  },
  {
    "id": "HDM-093",
    "number": 93,
    "name": "Status System Leak",
    "kind": "Magic",
    "family": "Capin / Truth Network",
    "image": "/cards/hdm-093.webp",
    "sourceFile": "HDM-093_HEADER_CLEAN_FINAL.png"
  },
  {
    "id": "HDM-094",
    "number": 94,
    "name": "EB & Igniscale",
    "kind": "Tamer",
    "family": "EB / Dual Flame",
    "image": "/cards/hdm-094.webp",
    "sourceFile": "HDM-094_EB_and_Igniscale_RECREATED_CLEAN_CROPPED.png"
  },
  {
    "id": "HDM-095",
    "number": 95,
    "name": "Ember Hatchling",
    "kind": "Hoodmon",
    "family": "EB / Dual Flame",
    "image": "/cards/hdm-095.webp",
    "sourceFile": "HDM-095_Ember_Hatchling_RECREATED_CLEAN_CROPPED.png"
  },
  {
    "id": "HDM-096",
    "number": 96,
    "name": "Smoldering Beard",
    "kind": "Hoodmon",
    "family": "EB / Dual Flame",
    "image": "/cards/hdm-096.webp",
    "sourceFile": "HDM-096_Smoldering_Beard_RECREATED_CLEAN_CROPPED.png"
  },
  {
    "id": "HDM-097",
    "number": 97,
    "name": "Ashen Warden",
    "kind": "Hoodmon",
    "family": "EB / Dual Flame",
    "image": "/cards/hdm-097.webp",
    "sourceFile": "HDM-097_Ashen_Warden_RECREATED_CLEAN_CROPPED.png"
  },
  {
    "id": "HDM-098",
    "number": 98,
    "name": "Shadow Hatchling",
    "kind": "Hoodmon",
    "family": "EB / Dual Flame",
    "image": "/cards/hdm-098.webp",
    "sourceFile": "HDM-098_Shadow_Hatchling_RULES_CLEAN_CROPPED.png"
  },
  {
    "id": "HDM-099",
    "number": 99,
    "name": "Duskwyrm",
    "kind": "Hoodmon",
    "family": "EB / Dual Flame",
    "image": "/cards/hdm-099.webp",
    "sourceFile": "HDM-099_Duskwyrm_RULES_CLEAN_CROPPED.png"
  },
  {
    "id": "HDM-100",
    "number": 100,
    "name": "Abyss Igniscale",
    "kind": "Hoodmon",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-100.webp",
    "sourceFile": "HDM-100_Abyss_Igniscale_RULES_CLEAN_CROPPED(1).png"
  },
  {
    "id": "HDM-101",
    "number": 101,
    "name": "Different Blood, Same Loyalty",
    "kind": "Magic",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-101.webp",
    "sourceFile": "HDM-101_Different_Blood_Same_Loyalty_RULES_CLEAN_CROPPED(1).png"
  },
  {
    "id": "HDM-102",
    "number": 102,
    "name": "Street Sweetheart Pact",
    "kind": "Magic",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-102.webp",
    "sourceFile": "HDM-102_Street_Sweetheart_Pact_FINAL_RULES_CROPPED(1).png"
  },
  {
    "id": "HDM-103",
    "number": 103,
    "name": "Reserve Roll Call",
    "kind": "Task",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-103.webp",
    "sourceFile": "HDM-103_Reserve_Roll_Call_FINAL_RULES_CROPPED(1).png"
  },
  {
    "id": "HDM-104",
    "number": 104,
    "name": "Flame Tag-Out",
    "kind": "Trap",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-104.webp",
    "sourceFile": "HDM-104_Flame_Tag_Out_FINAL_RULES_CROPPED(1).png"
  },
  {
    "id": "HDM-105",
    "number": 105,
    "name": "Split Flames, One Family",
    "kind": "Field",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-105.webp",
    "sourceFile": "HDM-105_Split_Flames_One_Family_FINAL_RULES_CROPPED(1).png"
  },
  {
    "id": "HDM-106",
    "number": 106,
    "name": "Shadowfire Exchange",
    "kind": "Magic",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-106.webp",
    "sourceFile": "HDM-106_Shadowfire_Exchange_FINAL_CROPPED(1).png"
  },
  {
    "id": "HDM-107",
    "number": 107,
    "name": "Peaches' Backup Bite",
    "kind": "Trap",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-107.webp",
    "sourceFile": "HDM-107_Peaches_Backup_Bite_FINAL_CROPPED(1).png"
  },
  {
    "id": "HDM-108",
    "number": 108,
    "name": "Blockfire Kennel",
    "kind": "Field",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-108.webp",
    "sourceFile": "HDM-108_Blockfire_Kennel_FINAL_CROPPED(1).png"
  },
  {
    "id": "HDM-109",
    "number": 109,
    "name": "Dual Line Awakening",
    "kind": "Magic",
    "family": "Dual Flame Bond",
    "image": "/cards/current/hdm-109.webp",
    "sourceFile": "HDM-109_Dual_Line_Awakening_FINAL_CROPPED(1).png"
  },
  {
    "id": "HDM-110",
    "number": 110,
    "name": "Crash Their Feed",
    "kind": "Task",
    "family": "Bird-Tech Block",
    "image": "/cards/current/hdm-110.webp",
    "sourceFile": "HDM-110_Crash_Their_Feed_FINAL_CROPPED(1).png"
  }
] as SeriesCard[]

export const series1Cards: SeriesCard[] = baseSeries1Cards.map((card) => {
  const current = masterMetadataById[card.id]
  if (!current) return card
  const currentPlaceholder = card.number >= 100 ? `/cards/current/hdm-${String(card.number).padStart(3, '0')}.webp` : card.image
  return { ...card, name: current.name, kind: current.kind, family: current.traits[0] ?? card.family, image: currentPlaceholder }
})

export const SERIES1_TOTAL = 110

if (series1Cards.length !== SERIES1_TOTAL) {
  throw new Error(`Series 1 database must contain ${SERIES1_TOTAL} cards; found ${series1Cards.length}.`)
}

export const cardById = Object.fromEntries(series1Cards.map((card) => [card.id, card])) as Record<string, SeriesCard>
