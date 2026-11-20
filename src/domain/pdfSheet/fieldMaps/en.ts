import type { PdfFieldMap } from "../types";

const SPELL_ROW_NAMES = [
  "text_306noh",
  "text_307kiz",
  "text_308oany",
  "text_309vlmr",
  "text_310iatm",
  "text_311eska",
  "text_312trhs",
  "text_313jros",
  "text_314gyue",
  "text_315plkl",
  "text_316ndrn",
  "text_317gkbw",
  "text_318ogf",
  "text_319huqd",
  "text_320kzak",
  "text_321ucnv",
  "text_322wcdj",
  "text_323kmpj",
  "text_324jzvi",
  "text_325xpvz",
  "text_326ydhp",
  "text_327kpws",
  "text_328uom",
  "text_329yurm",
  "text_330jyte",
  "text_331jfme",
  "text_332xoqp",
  "text_333ekrb",
  "text_334zias",
  "text_335znlw",
] as const;

function spellRowFields(): PdfFieldMap {
  const map: PdfFieldMap = {};
  SPELL_ROW_NAMES.forEach((field, index) => {
    map[`spellRow${index}`] = { field };
  });
  return map;
}

/** Semantic slot → AcroForm field on the English 2024 fillable sheet. */
export const EN_FIELD_MAP: PdfFieldMap = {
  // Header (verified: row2 = background+class, row3 = species+subclass)
  characterName: { field: "text_1imkp" },
  enBackgroundClassRow: { field: "text_2qgox" },
  enSpeciesSubclassRow: { field: "text_3bfkv" },
  level: { field: "text_4deth" },
  experiencePoints: { field: "text_5mocb" },

  // Combat (top-right): AC shield, HP, hit dice
  armorClass: { field: "text_6agjh" },
  hpCurrent: { field: "text_8bjml" },
  hpMax: { field: "text_9efgi" },
  hpTemp: { field: "text_10mexx" },
  hitDiceSpent: { field: "text_11dcsb" },
  hitDiceMax: { field: "text_12kvai" },

  // Utility row: Proficiency Bonus / Initiative / Speed / Size / Passive Perception
  proficiencyBonus: { field: "text_427aebp" },
  initiative: { field: "text_13wrft" },
  speed: { field: "text_14lvnq" },
  size: { field: "text_15cqja" },
  passivePerception: { field: "text_16wgea" },

  inspiration: { field: "checkbox_82wlwz", kind: "checkbox" },

  // Ability scores & modifiers
  strScore: { field: "text_17vpmg" },
  strMod: { field: "text_23ewgq" },
  dexScore: { field: "text_18ruyf" },
  dexMod: { field: "text_26ccgh" },
  conScore: { field: "text_21kabi" },
  conMod: { field: "text_28owjh" },
  intScore: { field: "text_19lqwv" },
  intMod: { field: "text_24rqar" },
  wisScore: { field: "text_20zbar" },
  wisMod: { field: "text_25blbj" },
  chaScore: { field: "text_22bxjy" },
  chaMod: { field: "text_27jhio" },

  // Saving throws — small bonus boxes on page 1 (ability clusters, not spell table)
  saveBonus_int: { field: "text_54bfgy" },
  saveBonus_str: { field: "text_60zpuk" },
  saveBonus_dex: { field: "text_68bipd" },
  saveBonus_con: { field: "text_72gnbq" },
  saveBonus_wis: { field: "text_62yaan" },
  saveBonus_cha: { field: "text_73cwxt" },
  saveProf_int: { field: "checkbox_119phvx", kind: "checkbox" },
  saveProf_str: { field: "checkbox_125msvq", kind: "checkbox" },
  saveProf_dex: { field: "checkbox_127neck", kind: "checkbox" },
  saveProf_con: { field: "checkbox_131jtbq", kind: "checkbox" },
  saveProf_wis: { field: "checkbox_245mnu", kind: "checkbox" },
  saveProf_cha: { field: "checkbox_251dtie", kind: "checkbox" },

  // Skills — small bonus boxes paired to proficiency checkboxes on page 1
  skillBonus_arcana: { field: "text_55nptn" },
  skillBonus_history: { field: "text_56ksru" },
  skillBonus_investigation: { field: "text_57bjob" },
  skillBonus_nature: { field: "text_58zoel" },
  skillBonus_religion: { field: "text_59mfqs" },
  skillBonus_athletics: { field: "text_61knsn" },
  skillBonus_acrobatics: { field: "text_69srmm" },
  skillBonus_sleightOfHand: { field: "text_70obrk" },
  skillBonus_stealth: { field: "text_71pflk" },
  skillBonus_animalHandling: { field: "text_63uhiv" },
  skillBonus_insight: { field: "text_64odvk" },
  skillBonus_medicine: { field: "text_65hnhb" },
  skillBonus_perception: { field: "text_66djlf" },
  skillBonus_survival: { field: "text_67cr" },
  skillBonus_deception: { field: "text_74rkfi" },
  skillBonus_intimidation: { field: "text_75pauh" },
  skillBonus_performance: { field: "text_76vfsc" },
  skillBonus_persuasion: { field: "text_77nads" },
  skillProf_arcana: { field: "checkbox_120drb", kind: "checkbox" },
  skillProf_history: { field: "checkbox_121xgrv", kind: "checkbox" },
  skillProf_investigation: { field: "checkbox_122zffm", kind: "checkbox" },
  skillProf_nature: { field: "checkbox_123smy", kind: "checkbox" },
  skillProf_religion: { field: "checkbox_124zscb", kind: "checkbox" },
  skillProf_athletics: { field: "checkbox_126dqaq", kind: "checkbox" },
  skillProf_acrobatics: { field: "checkbox_128cefr", kind: "checkbox" },
  skillProf_sleightOfHand: { field: "checkbox_129tlov", kind: "checkbox" },
  skillProf_stealth: { field: "checkbox_130ukqx", kind: "checkbox" },
  skillProf_animalHandling: { field: "checkbox_246hqns", kind: "checkbox" },
  skillProf_insight: { field: "checkbox_247lffe", kind: "checkbox" },
  skillProf_medicine: { field: "checkbox_248scbg", kind: "checkbox" },
  skillProf_perception: { field: "checkbox_249voxf", kind: "checkbox" },
  skillProf_survival: { field: "checkbox_250mjvi", kind: "checkbox" },
  skillProf_deception: { field: "checkbox_252naxc", kind: "checkbox" },
  skillProf_intimidation: { field: "checkbox_253mbyq", kind: "checkbox" },
  skillProf_performance: { field: "checkbox_254ypds", kind: "checkbox" },
  skillProf_persuasion: { field: "checkbox_255ltdr", kind: "checkbox" },

  // Death saves
  deathSaveSuccess1: { field: "checkbox_78ywrl", kind: "checkbox" },
  deathSaveSuccess2: { field: "checkbox_79gwxi", kind: "checkbox" },
  deathSaveSuccess3: { field: "checkbox_80xjpq", kind: "checkbox" },
  deathSaveFailure1: { field: "checkbox_81xqwc", kind: "checkbox" },
  deathSaveFailure2: { field: "checkbox_132oesm", kind: "checkbox" },
  deathSaveFailure3: { field: "checkbox_256gnfj", kind: "checkbox" },

  // Attacks (6 rows × name / atk / damage)
  attack1Name: { field: "text_95mtme" },
  attack1Bonus: { field: "text_101ohoi" },
  attack1Damage: { field: "text_107qvwl" },
  attack2Name: { field: "text_96nzoa" },
  attack2Bonus: { field: "text_102yibj" },
  attack2Damage: { field: "text_108aybq" },
  attack3Name: { field: "text_97iydj" },
  attack3Bonus: { field: "text_103rlae" },
  attack3Damage: { field: "text_109slbn" },
  attack4Name: { field: "text_98wnad" },
  attack4Bonus: { field: "text_104qwkw" },
  attack4Damage: { field: "text_110lbdh" },
  attack5Name: { field: "text_99bdzl" },
  attack5Bonus: { field: "text_105gvuz" },
  attack5Damage: { field: "text_111ubex" },
  attack6Name: { field: "text_100zmbl" },
  attack6Bonus: { field: "text_106vkdo" },
  attack6Damage: { field: "text_112omg" },

  // Page 1 — Equipment Training & Proficiencies / Features
  weaponProficiencies: { field: "textarea_89gsxf", kind: "textarea" },
  toolProficiencies: { field: "textarea_90mfnr", kind: "textarea" },
  speciesTraits: { field: "textarea_91jawi", kind: "textarea" },
  feats: { field: "textarea_92aaks", kind: "textarea" },
  classFeaturesLeft: { field: "textarea_93szqe", kind: "textarea" },
  classFeaturesRight: { field: "textarea_94ci", kind: "textarea" },

  // Page 2 — Spellcasting header
  spellAbilityMod: { field: "text_270axdp" },
  spellSaveDc: { field: "text_271dmmw" },
  spellAttackBonus: { field: "text_272rsuk" },

  // Page 2 — Magic item attunement (up to 3 attuned items)
  attunement1: { field: "text_262lxdq" },
  attunement2: { field: "text_263nbcj" },
  attunement3: { field: "text_264exxd" },

  // Currency (page 2) — left-to-right: CP SP EP GP PP
  currencyCp: { field: "text_265qztg" },
  currencySp: { field: "text_266ykte" },
  currencyEp: { field: "text_267yykj" },
  currencyGp: { field: "text_268lycv" },
  currencyPp: { field: "text_269bzjf" },

  // Page 2 — character notes
  languages: { field: "textarea_259fnwq", kind: "textarea" },
  equipment: { field: "textarea_260nudr", kind: "textarea" },
  appearance: { field: "textarea_273pluw", kind: "textarea" },
  alignment: { field: "text_275cexd" },
  backstory: { field: "textarea_274seuz", kind: "textarea" },

  // Spell slot used checkboxes — level 1 (rows top to bottom, 3 cols)
  spellUsedL1_0: { field: "checkbox_155igkk", kind: "checkbox" },
  spellUsedL1_1: { field: "checkbox_156dpdh", kind: "checkbox" },
  spellUsedL1_2: { field: "checkbox_157mcmr", kind: "checkbox" },
  spellUsedL1_3: { field: "checkbox_158tnpw", kind: "checkbox" },
  spellUsedL1_4: { field: "checkbox_159ykcu", kind: "checkbox" },
  spellUsedL1_5: { field: "checkbox_160leix", kind: "checkbox" },
  spellUsedL1_6: { field: "checkbox_161puyr", kind: "checkbox" },
  spellUsedL1_7: { field: "checkbox_162tygu", kind: "checkbox" },

  spellUsedL2_0: { field: "checkbox_163waps", kind: "checkbox" },
  spellUsedL2_1: { field: "checkbox_164vghx", kind: "checkbox" },
  spellUsedL2_2: { field: "checkbox_165zsg", kind: "checkbox" },
  spellUsedL2_3: { field: "checkbox_166rrhd", kind: "checkbox" },

  spellUsedL3_0: { field: "checkbox_167ftoe", kind: "checkbox" },
  spellUsedL3_1: { field: "checkbox_168wqfx", kind: "checkbox" },
  spellUsedL3_2: { field: "checkbox_169vree", kind: "checkbox" },

  spellUsedL4_0: { field: "checkbox_170xhdq", kind: "checkbox" },
  spellUsedL4_1: { field: "checkbox_171wuib", kind: "checkbox" },
  spellUsedL4_2: { field: "checkbox_172yxmq", kind: "checkbox" },

  spellUsedL5_0: { field: "checkbox_173fcki", kind: "checkbox" },
  spellUsedL5_1: { field: "checkbox_174ux", kind: "checkbox" },
  spellUsedL5_2: { field: "checkbox_175jjkg", kind: "checkbox" },

  spellUsedL6_0: { field: "checkbox_176hwey", kind: "checkbox" },
  spellUsedL6_1: { field: "checkbox_177gcrg", kind: "checkbox" },

  spellUsedL7_0: { field: "checkbox_178mfym", kind: "checkbox" },
  spellUsedL7_1: { field: "checkbox_179rogc", kind: "checkbox" },

  spellUsedL8_0: { field: "checkbox_180wozz", kind: "checkbox" },
  spellUsedL8_1: { field: "checkbox_181xloo", kind: "checkbox" },

  spellUsedL9_0: { field: "checkbox_182fzje", kind: "checkbox" },
  spellUsedL9_1: { field: "checkbox_183jbbp", kind: "checkbox" },

  ...spellRowFields(),
};
