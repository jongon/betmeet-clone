export type Confederation = "CONMEBOL" | "UEFA" | "CAF" | "AFC" | "CONCACAF" | "OFC";

export type TeamSeed = {
  albumCode: string;
  displayName: string;
  isoCode: string;
  confederation: Confederation;
};

export type StickerType = "PLAYER" | "BADGE" | "TEAM_PHOTO" | "SPECIAL";

export type AlbumGroup = {
  groupCode: string;
  displayName: string;
  isoCode: string | null;
  confederation: Confederation | "SPECIAL";
};

export type AlbumSticker = {
  code: string;
  groupCode: string;
  position: number;
  type: StickerType;
  label: string;
};

const FWC_GROUP: AlbumGroup = {
  groupCode: "FWC",
  displayName: "FWC",
  isoCode: null,
  confederation: "SPECIAL",
};

const TEAM_SEED: TeamSeed[] = [
  { albumCode: "ARG", displayName: "Argentina", isoCode: "AR", confederation: "CONMEBOL" },
  { albumCode: "BRA", displayName: "Brasil", isoCode: "BR", confederation: "CONMEBOL" },
  { albumCode: "COL", displayName: "Colombia", isoCode: "CO", confederation: "CONMEBOL" },
  { albumCode: "ECU", displayName: "Ecuador", isoCode: "EC", confederation: "CONMEBOL" },
  { albumCode: "PAR", displayName: "Paraguay", isoCode: "PY", confederation: "CONMEBOL" },
  { albumCode: "URU", displayName: "Uruguay", isoCode: "UY", confederation: "CONMEBOL" },

  { albumCode: "ENG", displayName: "Inglaterra", isoCode: "GB-ENG", confederation: "UEFA" },
  { albumCode: "FRA", displayName: "Francia", isoCode: "FR", confederation: "UEFA" },
  { albumCode: "CRO", displayName: "Croacia", isoCode: "HR", confederation: "UEFA" },
  { albumCode: "POR", displayName: "Portugal", isoCode: "PT", confederation: "UEFA" },
  { albumCode: "NOR", displayName: "Noruega", isoCode: "NO", confederation: "UEFA" },
  { albumCode: "GER", displayName: "Alemania", isoCode: "DE", confederation: "UEFA" },
  { albumCode: "NED", displayName: "Países Bajos", isoCode: "NL", confederation: "UEFA" },
  { albumCode: "BEL", displayName: "Bélgica", isoCode: "BE", confederation: "UEFA" },
  { albumCode: "AUT", displayName: "Austria", isoCode: "AT", confederation: "UEFA" },
  { albumCode: "ESP", displayName: "España", isoCode: "ES", confederation: "UEFA" },
  { albumCode: "SUI", displayName: "Suiza", isoCode: "CH", confederation: "UEFA" },
  { albumCode: "SCO", displayName: "Escocia", isoCode: "GB-SCO", confederation: "UEFA" },
  { albumCode: "TUR", displayName: "Turquía", isoCode: "TR", confederation: "UEFA" },
  { albumCode: "BIH", displayName: "Bosnia", isoCode: "BA", confederation: "UEFA" },
  { albumCode: "SWE", displayName: "Suecia", isoCode: "SE", confederation: "UEFA" },
  { albumCode: "CZE", displayName: "Chequia", isoCode: "CZ", confederation: "UEFA" },

  { albumCode: "MAR", displayName: "Marruecos", isoCode: "MA", confederation: "CAF" },
  { albumCode: "TUN", displayName: "Túnez", isoCode: "TN", confederation: "CAF" },
  { albumCode: "EGY", displayName: "Egipto", isoCode: "EG", confederation: "CAF" },
  { albumCode: "ALG", displayName: "Argelia", isoCode: "DZ", confederation: "CAF" },
  { albumCode: "GHA", displayName: "Ghana", isoCode: "GH", confederation: "CAF" },
  { albumCode: "CPV", displayName: "Cabo Verde", isoCode: "CV", confederation: "CAF" },
  { albumCode: "RSA", displayName: "Sudáfrica", isoCode: "ZA", confederation: "CAF" },
  { albumCode: "CIV", displayName: "Costa de Marfil", isoCode: "CI", confederation: "CAF" },
  { albumCode: "SEN", displayName: "Senegal", isoCode: "SN", confederation: "CAF" },
  { albumCode: "COD", displayName: "RD Congo", isoCode: "CD", confederation: "CAF" },

  { albumCode: "JPN", displayName: "Japón", isoCode: "JP", confederation: "AFC" },
  { albumCode: "IRN", displayName: "Irán", isoCode: "IR", confederation: "AFC" },
  { albumCode: "UZB", displayName: "Uzbekistán", isoCode: "UZ", confederation: "AFC" },
  { albumCode: "KOR", displayName: "Corea del Sur", isoCode: "KR", confederation: "AFC" },
  { albumCode: "JOR", displayName: "Jordania", isoCode: "JO", confederation: "AFC" },
  { albumCode: "AUS", displayName: "Australia", isoCode: "AU", confederation: "AFC" },
  { albumCode: "QAT", displayName: "Qatar", isoCode: "QA", confederation: "AFC" },
  { albumCode: "KSA", displayName: "Arabia Saudita", isoCode: "SA", confederation: "AFC" },
  { albumCode: "IRQ", displayName: "Irak", isoCode: "IQ", confederation: "AFC" },

  { albumCode: "USA", displayName: "Estados Unidos", isoCode: "US", confederation: "CONCACAF" },
  { albumCode: "MEX", displayName: "México", isoCode: "MX", confederation: "CONCACAF" },
  { albumCode: "CAN", displayName: "Canadá", isoCode: "CA", confederation: "CONCACAF" },
  { albumCode: "PAN", displayName: "Panamá", isoCode: "PA", confederation: "CONCACAF" },
  { albumCode: "CUR", displayName: "Curazao", isoCode: "CW", confederation: "CONCACAF" },
  { albumCode: "HAI", displayName: "Haití", isoCode: "HT", confederation: "CONCACAF" },

  { albumCode: "NZL", displayName: "Nueva Zelanda", isoCode: "NZ", confederation: "OFC" },
];

export function getAlbumGroups(): AlbumGroup[] {
  return [
    ...TEAM_SEED.map((team) => ({
      groupCode: team.albumCode,
      displayName: team.displayName,
      isoCode: team.isoCode,
      confederation: team.confederation,
    })),
    FWC_GROUP,
  ];
}

export function getGroupStickers(groupCode: string): AlbumSticker[] {
  if (groupCode === "FWC") {
    return Array.from({ length: 20 }, (_, index) => {
      const code = `FWC-${index}`;
      return {
        code,
        groupCode: "FWC",
        position: index,
        type: "SPECIAL",
        label: `Especial ${index + 1}`,
      };
    });
  }

  return Array.from({ length: 20 }, (_, index) => {
    const position = index + 1;
    const code = `${groupCode}-${position}`;
    const type = getStickerType(code);
    return {
      code,
      groupCode,
      position,
      type,
      label: getStickerLabel(type, position),
    };
  });
}

export function getStickerType(code: string): StickerType {
  if (code.startsWith("FWC-")) return "SPECIAL";
  const parts = code.split("-");
  const position = Number(parts[1] ?? "0");
  if (position === 1) return "BADGE";
  if (position === 13) return "TEAM_PHOTO";
  return "PLAYER";
}

export function getStickerLabel(type: StickerType, position: number): string {
  switch (type) {
    case "BADGE":
      return "Badge de selección";
    case "TEAM_PHOTO":
      return "Foto de equipo";
    case "SPECIAL":
      return "Especial";
    default:
      return `Jugador ${position}`;
  }
}

export function getAlbumTotal(): number {
  return TEAM_SEED.length * 20 + 20;
}

export function isValidGroupCode(groupCode: string): boolean {
  return groupCode === "FWC" || TEAM_SEED.some((team) => team.albumCode === groupCode);
}

export function getFlagCode(isoCode: string | null): string | null {
  if (!isoCode) return null;
  return isoCode;
}

export function getGroupByCode(groupCode: string): AlbumGroup | null {
  if (groupCode === "FWC") return FWC_GROUP;
  const team = TEAM_SEED.find((item) => item.albumCode === groupCode);
  if (!team) return null;
  return {
    groupCode: team.albumCode,
    displayName: team.displayName,
    isoCode: team.isoCode,
    confederation: team.confederation,
  };
}
