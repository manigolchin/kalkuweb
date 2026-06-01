/**
 * KT01 Firmen-Verzeichnis — baked snapshot of every Bauunternehmer-Ordner
 * in the kalkuteam OneDrive (KT01), so the panel's Firmen-Liste always shows
 * the full company list even when the live preisanfrage token isn't set.
 *
 * Source of truth at runtime is still preisanfrage (managed + external rows);
 * when that data is available the firmen route dedupes these directory rows
 * against it by folderName (live data wins). This file is the offline floor.
 *
 * Snapshot taken 2026-06-01T11:38:05Z from production procurement-db
 * (companies + external_companies). Regenerate by re-running the snapshot.
 * DO NOT hand-edit individual rows — regenerate instead.
 */

export type Kt01Firma = {
  /** Stable URL-safe id used as the `directory` firma id in routes. */
  slug: string;
  displayName: string;
  /** OneDrive drive-root folder, e.g. "1349_Ideal Elektrosysteme GmbH". */
  folderName: string | null;
  /** Known for managed firms; inferred from name for some externals; else null. */
  tradeType: string | null;
  /** Project sub-folders counted at last scan (externals); null if unknown. */
  projectCount: number | null;
};

export const KT01_SNAPSHOT_AT = '2026-06-01T11:38:05Z';

export const KT01_FIRMEN: readonly Kt01Firma[] = [
  {
    "slug": "1462-1-malerbetrieb-garms",
    "displayName": "1 Malerbetrieb Garms",
    "folderName": "1462_1_Malerbetrieb_Garms",
    "tradeType": "maler",
    "projectCount": 1
  },
  {
    "slug": "1350-1-rado-facility-management-einzel",
    "displayName": "1 Rado Facility Management Einzel",
    "folderName": "1350_1_Rado_Facility Management_Einzel",
    "tradeType": "reinigung",
    "projectCount": 7
  },
  {
    "slug": "1350-2-berliner-facility-gemeinschaft-gmbh",
    "displayName": "2 Berliner Facility Gemeinschaft GmbH",
    "folderName": "1350_2_Berliner_Facility_Gemeinschaft_GmbH",
    "tradeType": "reinigung",
    "projectCount": 2
  },
  {
    "slug": "1804-2-cos-clering-out-gmbh",
    "displayName": "2 COS Clering Out GmbH",
    "folderName": "1804_2_COS_Clering_Out_GmbH",
    "tradeType": "schadstoff",
    "projectCount": 1
  },
  {
    "slug": "1462-2-malerbetrieb-garms-gmbh",
    "displayName": "2 Malerbetrieb Garms GmbH",
    "folderName": "1462_2_Malerbetrieb_Garms_GmbH",
    "tradeType": "maler",
    "projectCount": 0
  },
  {
    "slug": "1200-2-profis-24-gmbh",
    "displayName": "2 profis 24 GmbH",
    "folderName": "1200_2_profis_24_GmbH",
    "tradeType": null,
    "projectCount": 4
  },
  {
    "slug": "1852-abdichtungstechnik-opl",
    "displayName": "Abdichtungstechnik OPL",
    "folderName": "1852_Abdichtungstechnik_OPL",
    "tradeType": "dach",
    "projectCount": 4
  },
  {
    "slug": "1900-allround-sonnenschutz",
    "displayName": "Allround Sonnenschutz",
    "folderName": "1900_Allround_Sonnenschutz",
    "tradeType": null,
    "projectCount": 6
  },
  {
    "slug": "1797-altmarker-solarstrom-gmbh",
    "displayName": "Altmärker Solarstrom GmbH",
    "folderName": "1797_Altmärker_Solarstrom_GmbH",
    "tradeType": null,
    "projectCount": 17
  },
  {
    "slug": "1727-alunek-gebruder-luma-gbr",
    "displayName": "AluNek Gebrüder Luma GbR",
    "folderName": "1727_AluNek_Gebrüder_Luma_GbR",
    "tradeType": null,
    "projectCount": 4
  },
  {
    "slug": "1931-asb-gebaudereinigung",
    "displayName": "ASB Gebäudereinigung",
    "folderName": "1931_ASB_Gebäudereinigung",
    "tradeType": "reinigung",
    "projectCount": 1
  },
  {
    "slug": "1704-bau-team-hellerwald",
    "displayName": "Bau Team Hellerwald",
    "folderName": "1704_Bau_Team_Hellerwald",
    "tradeType": null,
    "projectCount": 3
  },
  {
    "slug": "1806-becker-gmbh",
    "displayName": "Becker GmbH",
    "folderName": "1806_Becker_GmbH",
    "tradeType": null,
    "projectCount": 13
  },
  {
    "slug": "1495-bernwerk",
    "displayName": "Bernwerk",
    "folderName": "1495_Bernwerk",
    "tradeType": null,
    "projectCount": 24
  },
  {
    "slug": "1274-blitzreinigung-ceylan",
    "displayName": "Blitzreinigung Ceylan",
    "folderName": "1274_Blitzreinigung_Ceylan",
    "tradeType": "reinigung",
    "projectCount": 3
  },
  {
    "slug": "1952-bochtler-medientechnik",
    "displayName": "Bochtler Medientechnik",
    "folderName": "1952_Bochtler_Medientechnik",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "924-byk-metallbau-gmbh",
    "displayName": "BYK Metallbau GmbH",
    "folderName": "924_BYK_Metallbau_GmbH",
    "tradeType": "metallbau",
    "projectCount": 2
  },
  {
    "slug": "868-capital-city-construction",
    "displayName": "Capital City Construction",
    "folderName": "868_Capital_City_Construction",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1827-clean-energy-24-gmbh",
    "displayName": "Clean_Energy_24",
    "folderName": "1827_Clean_Energy_24_GmbH",
    "tradeType": "elektro",
    "projectCount": null
  },
  {
    "slug": "1804-1-cos-schadstoffservice-gmbh",
    "displayName": "COS Schadstoff Service GmbH",
    "folderName": "1804_1_COS_Schadstoffservice_GmbH",
    "tradeType": "schadstoff",
    "projectCount": 13
  },
  {
    "slug": "79-deuling-pfahlgrundung",
    "displayName": "Deuling Pfahlgründung",
    "folderName": "79_Deuling-Pfahlgründung",
    "tradeType": "tiefbau",
    "projectCount": null
  },
  {
    "slug": "1964-die-hausmeisterei",
    "displayName": "Die Hausmeisterei",
    "folderName": "1964_Die_Hausmeisterei",
    "tradeType": "reinigung",
    "projectCount": 2
  },
  {
    "slug": "1800-di-pa",
    "displayName": "Dillenburger GmbH",
    "folderName": "1800_di-pa",
    "tradeType": "haustechnik",
    "projectCount": null
  },
  {
    "slug": "1235-doga-garten-und-landschaftsbau-gmbh",
    "displayName": "Doga Garten- und Landschaftsbau GmbH",
    "folderName": "1235_Doga Garten- und Landschaftsbau GmbH",
    "tradeType": "galabau",
    "projectCount": 1
  },
  {
    "slug": "1894-dustlessservice-gmbh",
    "displayName": "Dustlessservice GmbH",
    "folderName": "1894_Dustlessservice_GmbH",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1247-elektro-aulendorf",
    "displayName": "Elektro Plus Aulendorf",
    "folderName": "1247_Elektro_+_Aulendorf",
    "tradeType": "elektro",
    "projectCount": 15
  },
  {
    "slug": "1930-elektro-schillinger",
    "displayName": "Elektro Schillinger GmbH",
    "folderName": "1930_Elektro_Schillinger",
    "tradeType": "elektro",
    "projectCount": 1
  },
  {
    "slug": "1898-elektro-schwarzkopf",
    "displayName": "Elektro Schwarzkopf",
    "folderName": "1898_Elektro_Schwarzkopf",
    "tradeType": "elektro",
    "projectCount": null
  },
  {
    "slug": "1916-elektro-seebach",
    "displayName": "Elektro Seebach",
    "folderName": "1916_Elektro_Seebach",
    "tradeType": "elektro",
    "projectCount": 1
  },
  {
    "slug": "1807-elektro-voesch-gmbh",
    "displayName": "Elektro Voesch GmbH",
    "folderName": "1807_Elektro_Voesch_GmbH",
    "tradeType": "elektro",
    "projectCount": 1
  },
  {
    "slug": "1993-elektrobau-schneider-gmbh",
    "displayName": "Elektrobau Schneider GmbH",
    "folderName": "1993_Elektrobau_Schneider_GmbH",
    "tradeType": "elektro",
    "projectCount": 2
  },
  {
    "slug": "1362-elektrotechnik-salvus",
    "displayName": "Elektrotechnik Salvus",
    "folderName": "1362_Elektrotechnik Salvus",
    "tradeType": "elektro",
    "projectCount": 6
  },
  {
    "slug": "1765-elkab-system-gmbh",
    "displayName": "Elkab System GmbH",
    "folderName": "1765_Elkab_System_GmbH",
    "tradeType": "elektro",
    "projectCount": null
  },
  {
    "slug": "1209-emmig-und-buschko-gmbh",
    "displayName": "Emmig und Buschko GmbH",
    "folderName": "1209_Emmig_und_Buschko_GmbH",
    "tradeType": null,
    "projectCount": 6
  },
  {
    "slug": "2111-f-koc-galabau",
    "displayName": "F. Koc Garten- und Landschaftsbau",
    "folderName": "2111_F_Koc_GaLaBau",
    "tradeType": "galabau",
    "projectCount": null
  },
  {
    "slug": "1275-gabas-gmbh",
    "displayName": "Gabas GmbH",
    "folderName": "1275_Gabas_GmbH",
    "tradeType": null,
    "projectCount": 62
  },
  {
    "slug": "1695-gesellchen-gmbh",
    "displayName": "Gesellchen GmbH",
    "folderName": "1695_Gesellchen_GmbH",
    "tradeType": "galabau",
    "projectCount": null
  },
  {
    "slug": "1808-gtm-bauservice-gmbh",
    "displayName": "GTM Bauservice GmbH",
    "folderName": "1808_GTM_Bauservice_GmbH",
    "tradeType": null,
    "projectCount": 10
  },
  {
    "slug": "1183-h-w",
    "displayName": "H&W",
    "folderName": "1183_H&W",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1805-hans-elektrotechnik-gmbh",
    "displayName": "Hans Elektrotechnik GmbH",
    "folderName": "1805_Hans_Elektrotechnik_GmbH",
    "tradeType": "elektro",
    "projectCount": 4
  },
  {
    "slug": "1306-haustechnik-janetzki",
    "displayName": "Haustechnik Janetzki",
    "folderName": "1306_Haustechnik_Janetzki",
    "tradeType": null,
    "projectCount": 3
  },
  {
    "slug": "690-hbs-bauwerk",
    "displayName": "HBS BAUWERK",
    "folderName": "690_HBS_BAUWERK",
    "tradeType": null,
    "projectCount": 30
  },
  {
    "slug": "1835-huk-elektrotechnik-gmbh",
    "displayName": "HUK Elektrotechnik GmbH",
    "folderName": "1835_HUK_Elektrotechnik_GmbH",
    "tradeType": "elektro",
    "projectCount": 2
  },
  {
    "slug": "1708-ict-ag",
    "displayName": "ICT AG",
    "folderName": "1708_ICT_AG",
    "tradeType": null,
    "projectCount": 2
  },
  {
    "slug": "1349-ideal-elektrosysteme-gmbh",
    "displayName": "Ideal Elektrosysteme GmbH",
    "folderName": "1349_Ideal Elektrosysteme GmbH",
    "tradeType": "elektro",
    "projectCount": 8
  },
  {
    "slug": "1463-justus-tiefbau",
    "displayName": "Justus Tiefbau",
    "folderName": "1463_Justus_Tiefbau",
    "tradeType": "tiefbau",
    "projectCount": 3
  },
  {
    "slug": "1308-liderbau-gmbh",
    "displayName": "LiderBau GmbH",
    "folderName": "1308_LiderBau_GmbH",
    "tradeType": null,
    "projectCount": 56
  },
  {
    "slug": "926-liga-gmbh",
    "displayName": "LiGa GmbH",
    "folderName": "926_LiGa_GmbH",
    "tradeType": null,
    "projectCount": 3
  },
  {
    "slug": "1967-m-e-d",
    "displayName": "M.E.D",
    "folderName": "1967_M.E.D",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1226-maxx-plan-gmbh",
    "displayName": "Maxx Plan GmbH",
    "folderName": "1226_Maxx_Plan_GmbH",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1972-messingschlager-gmbh",
    "displayName": "Messingschlager GmbH",
    "folderName": "1972_Messingschlager_GmbH",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1234-meyer-metallbau-gmbh",
    "displayName": "Meyer Metallbau GmbH",
    "folderName": "1234_Meyer_Metallbau_GmbH",
    "tradeType": "metallbau",
    "projectCount": 10
  },
  {
    "slug": "2010-mj-gbr",
    "displayName": "MJ GbR",
    "folderName": "2010_MJ_GbR",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "monjako",
    "displayName": "Monjako",
    "folderName": null,
    "tradeType": "fenster",
    "projectCount": null
  },
  {
    "slug": "427-monjako-invest",
    "displayName": "Monjako-Invest",
    "folderName": "427_Monjako-Invest_",
    "tradeType": null,
    "projectCount": 51
  },
  {
    "slug": "1697-mpb-bau",
    "displayName": "MPB Bau",
    "folderName": "1697_MPB_Bau",
    "tradeType": "leitungsbau",
    "projectCount": null
  },
  {
    "slug": "1547-n-grow-gmbh",
    "displayName": "N-Grow GmbH",
    "folderName": "1547_N-Grow_GmbH",
    "tradeType": "galabau",
    "projectCount": null
  },
  {
    "slug": "1884-neuwatt-gmbh",
    "displayName": "Neuwatt GmbH",
    "folderName": "1884_Neuwatt_GmbH",
    "tradeType": null,
    "projectCount": 2
  },
  {
    "slug": "1897-otto-speetzen-elektotechnik-gmbh",
    "displayName": "Otto Speetzen Elektrotechnik GmbH",
    "folderName": "1897_Otto_Speetzen_Elektotechnik_GmbH",
    "tradeType": "elektro",
    "projectCount": null
  },
  {
    "slug": "1937-paultrans",
    "displayName": "Paultrans",
    "folderName": "1937_Paultrans",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1485-pk-brandschutz-gmbh",
    "displayName": "PK Brandschutz GmbH",
    "folderName": "1485_PK Brandschutz GmbH",
    "tradeType": "brandschutz",
    "projectCount": 1
  },
  {
    "slug": "1878-rds-grungestalt-gmbh",
    "displayName": "RDS Grüngestalt GmbH",
    "folderName": "1878_RDS_Grüngestalt_GmbH",
    "tradeType": "galabau",
    "projectCount": 2
  },
  {
    "slug": "1783-rengers-hochbaugesellschaft",
    "displayName": "Rengers Hochbaugesellschaft",
    "folderName": "1783_Rengers_Hochbaugesellschaft",
    "tradeType": null,
    "projectCount": 7
  },
  {
    "slug": "1157-s-n-behnke-ug",
    "displayName": "S&N Behnke UG",
    "folderName": "1157_S&N_Behnke_UG",
    "tradeType": null,
    "projectCount": 16
  },
  {
    "slug": "2006-sadriu-trockenbau-und-montage",
    "displayName": "Sadriu Trockenbau und Montage",
    "folderName": "2006_Sadriu_Trockenbau_und_Montage",
    "tradeType": "trockenbau",
    "projectCount": 2
  },
  {
    "slug": "1747-schmoll-sohn-gmbh",
    "displayName": "Schmoll + Sohn GmbH",
    "folderName": "1747_Schmoll_+_Sohn_GmbH",
    "tradeType": null,
    "projectCount": 1
  },
  {
    "slug": "1651-smb-gmbh-hls",
    "displayName": "SMB GmbH HLS",
    "folderName": "1651_SMB GmbH HLS",
    "tradeType": null,
    "projectCount": 8
  },
  {
    "slug": "2019-stano-gebaudeservice",
    "displayName": "STANO Gebäudeservice",
    "folderName": "2019_STANO_Gebäudeservice",
    "tradeType": "reinigung",
    "projectCount": 2
  },
  {
    "slug": "1817-stier-reinigung",
    "displayName": "Stier Reinigung",
    "folderName": "1817_Stier_Reinigung",
    "tradeType": "reinigung",
    "projectCount": 6
  },
  {
    "slug": "2060-sturm-und-partner",
    "displayName": "Sturm und Partner",
    "folderName": "2060_Sturm und Partner",
    "tradeType": null,
    "projectCount": 2
  },
  {
    "slug": "1922-t-d-dachabdichtung-ug",
    "displayName": "T&D Dachabdichtung UG",
    "folderName": "1922_T&D_Dachabdichtung_UG",
    "tradeType": "dach",
    "projectCount": 1
  },
  {
    "slug": "1836-t-nissen-erd-und-baggerarbeiten",
    "displayName": "T. Nissen Erd- und Baggerarbeiten",
    "folderName": "1836_T.Nissen_Erd-und_Baggerarbeiten",
    "tradeType": "galabau",
    "projectCount": 2
  },
  {
    "slug": "1915-thermo-rhein-west-gmbh",
    "displayName": "Thermo Rhein West GmbH",
    "folderName": "1915_Thermo_Rhein_West_GmbH",
    "tradeType": null,
    "projectCount": 2
  },
  {
    "slug": "1895-tiefbau-carstens",
    "displayName": "Tiefbau Carstens",
    "folderName": "1895_Tiefbau_Carstens",
    "tradeType": "tiefbau",
    "projectCount": 7
  },
  {
    "slug": "1386-waligorski-fliesenlegerbetrieb",
    "displayName": "Waligorski Fliesenlegerbetrieb",
    "folderName": "1386_Waligorski_Fliesenlegerbetrieb",
    "tradeType": null,
    "projectCount": 4
  },
  {
    "slug": "1911-wareda-elektroanlagen",
    "displayName": "Wareda Elektroanlagen",
    "folderName": "1911_Wareda_Elektroanlagen",
    "tradeType": "elektro",
    "projectCount": 4
  },
  {
    "slug": "1893-wirtz-okotechnik-gbr",
    "displayName": "Wirtz Ökotechnik GbR",
    "folderName": "1893_Wirtz_Ökotechnik_GbR",
    "tradeType": null,
    "projectCount": 2
  },
  {
    "slug": "1199-warme-wimmer-gmbh",
    "displayName": "Wärme Wimmer GmbH",
    "folderName": "1199_Wärme_Wimmer_GmbH",
    "tradeType": null,
    "projectCount": 15
  }
] as const;
