type Confederation = "CONMEBOL" | "UEFA" | "CAF" | "AFC" | "CONCACAF" | "OFC";

type TeamSeed = {
  albumCode: string;
  displayName: string;
  isoCode: string;
  confederation: Confederation;
};

export type StickerType = "PLAYER" | "BADGE" | "TEAM_PHOTO" | "SPECIAL";

export const STICKER_TYPE_LABEL: Record<StickerType, string> = {
  BADGE: "Badge",
  TEAM_PHOTO: "Equipo",
  PLAYER: "Jugador",
  SPECIAL: "Especial",
};

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
  { albumCode: "MEX", displayName: "México", isoCode: "MX", confederation: "CONCACAF" },
  { albumCode: "RSA", displayName: "Sudáfrica", isoCode: "ZA", confederation: "CAF" },
  { albumCode: "KOR", displayName: "Corea del Sur", isoCode: "KR", confederation: "AFC" },
  { albumCode: "CZE", displayName: "Chequia", isoCode: "CZ", confederation: "UEFA" },
  { albumCode: "CAN", displayName: "Canadá", isoCode: "CA", confederation: "CONCACAF" },
  { albumCode: "BIH", displayName: "Bosnia", isoCode: "BA", confederation: "UEFA" },
  { albumCode: "QAT", displayName: "Qatar", isoCode: "QA", confederation: "AFC" },
  { albumCode: "SUI", displayName: "Suiza", isoCode: "CH", confederation: "UEFA" },
  { albumCode: "BRA", displayName: "Brasil", isoCode: "BR", confederation: "CONMEBOL" },
  { albumCode: "MAR", displayName: "Marruecos", isoCode: "MA", confederation: "CAF" },
  { albumCode: "HAI", displayName: "Haití", isoCode: "HT", confederation: "CONCACAF" },
  { albumCode: "SCO", displayName: "Escocia", isoCode: "GB-SCO", confederation: "UEFA" },
  { albumCode: "USA", displayName: "Estados Unidos", isoCode: "US", confederation: "CONCACAF" },
  { albumCode: "PAR", displayName: "Paraguay", isoCode: "PY", confederation: "CONMEBOL" },
  { albumCode: "AUS", displayName: "Australia", isoCode: "AU", confederation: "AFC" },
  { albumCode: "TUR", displayName: "Turquía", isoCode: "TR", confederation: "UEFA" },
  { albumCode: "GER", displayName: "Alemania", isoCode: "DE", confederation: "UEFA" },
  { albumCode: "CUR", displayName: "Curazao", isoCode: "CW", confederation: "CONCACAF" },
  { albumCode: "CIV", displayName: "Costa de Marfil", isoCode: "CI", confederation: "CAF" },
  { albumCode: "ECU", displayName: "Ecuador", isoCode: "EC", confederation: "CONMEBOL" },
  { albumCode: "NED", displayName: "Países Bajos", isoCode: "NL", confederation: "UEFA" },
  { albumCode: "JPN", displayName: "Japón", isoCode: "JP", confederation: "AFC" },
  { albumCode: "SWE", displayName: "Suecia", isoCode: "SE", confederation: "UEFA" },
  { albumCode: "TUN", displayName: "Túnez", isoCode: "TN", confederation: "CAF" },
  { albumCode: "BEL", displayName: "Bélgica", isoCode: "BE", confederation: "UEFA" },
  { albumCode: "EGY", displayName: "Egipto", isoCode: "EG", confederation: "CAF" },
  { albumCode: "IRN", displayName: "Irán", isoCode: "IR", confederation: "AFC" },
  { albumCode: "NZL", displayName: "Nueva Zelanda", isoCode: "NZ", confederation: "OFC" },
  { albumCode: "ESP", displayName: "España", isoCode: "ES", confederation: "UEFA" },
  { albumCode: "CPV", displayName: "Cabo Verde", isoCode: "CV", confederation: "CAF" },
  { albumCode: "KSA", displayName: "Arabia Saudita", isoCode: "SA", confederation: "AFC" },
  { albumCode: "URU", displayName: "Uruguay", isoCode: "UY", confederation: "CONMEBOL" },
  { albumCode: "FRA", displayName: "Francia", isoCode: "FR", confederation: "UEFA" },
  { albumCode: "SEN", displayName: "Senegal", isoCode: "SN", confederation: "CAF" },
  { albumCode: "IRQ", displayName: "Irak", isoCode: "IQ", confederation: "AFC" },
  { albumCode: "NOR", displayName: "Noruega", isoCode: "NO", confederation: "UEFA" },
  { albumCode: "ARG", displayName: "Argentina", isoCode: "AR", confederation: "CONMEBOL" },
  { albumCode: "ALG", displayName: "Argelia", isoCode: "DZ", confederation: "CAF" },
  { albumCode: "AUT", displayName: "Austria", isoCode: "AT", confederation: "UEFA" },
  { albumCode: "JOR", displayName: "Jordania", isoCode: "JO", confederation: "AFC" },
  { albumCode: "POR", displayName: "Portugal", isoCode: "PT", confederation: "UEFA" },
  { albumCode: "COD", displayName: "RD Congo", isoCode: "CD", confederation: "CAF" },
  { albumCode: "UZB", displayName: "Uzbekistán", isoCode: "UZ", confederation: "AFC" },
  { albumCode: "COL", displayName: "Colombia", isoCode: "CO", confederation: "CONMEBOL" },
  { albumCode: "ENG", displayName: "Inglaterra", isoCode: "GB-ENG", confederation: "UEFA" },
  { albumCode: "CRO", displayName: "Croacia", isoCode: "HR", confederation: "UEFA" },
  { albumCode: "GHA", displayName: "Ghana", isoCode: "GH", confederation: "CAF" },
  { albumCode: "PAN", displayName: "Panamá", isoCode: "PA", confederation: "CONCACAF" },
];

const GROUP_ORDER = new Map<string, number>([
  [FWC_GROUP.groupCode, 0],
  ...TEAM_SEED.map((team, index) => [team.albumCode, index + 1] as const),
]);

export function getAlbumGroups(): AlbumGroup[] {
  return [
    FWC_GROUP,
    ...TEAM_SEED.map((team) => ({
      groupCode: team.albumCode,
      displayName: team.displayName,
      isoCode: team.isoCode,
      confederation: team.confederation,
    })),
  ];
}

export function getAllAlbumStickers(): AlbumSticker[] {
  return getAlbumGroups().flatMap((group) => getGroupStickers(group.groupCode));
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
      return `Jugador ${getPlayerLabelNumber(position)}`;
  }
}

function getPlayerLabelNumber(position: number): number {
  if (position < 13) {
    return position - 1;
  }

  return position - 2;
}

export function getAlbumTotal(): number {
  return TEAM_SEED.length * 20 + 20;
}

function compareAlbumGroupCodes(left: string, right: string): number {
  const leftOrder = GROUP_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = GROUP_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.localeCompare(right, "es");
}

export function compareAlbumStickerCodes(left: string, right: string): number {
  const [leftGroup = left, leftRawPosition = "0"] = left.split("-");
  const [rightGroup = right, rightRawPosition = "0"] = right.split("-");
  const groupComparison = compareAlbumGroupCodes(leftGroup, rightGroup);

  if (groupComparison !== 0) {
    return groupComparison;
  }

  const leftPosition = Number(leftRawPosition);
  const rightPosition = Number(rightRawPosition);

  if (
    Number.isInteger(leftPosition) &&
    Number.isInteger(rightPosition) &&
    leftPosition !== rightPosition
  ) {
    return leftPosition - rightPosition;
  }

  return left.localeCompare(right, "es");
}

export function isValidGroupCode(groupCode: string): boolean {
  return groupCode === "FWC" || TEAM_SEED.some((team) => team.albumCode === groupCode);
}

export function isValidStickerCode(stickerCode: string): boolean {
  const [groupCode, rawPosition] = stickerCode.split("-");
  if (!groupCode || !rawPosition || !isValidGroupCode(groupCode)) {
    return false;
  }

  const position = Number(rawPosition);
  if (!Number.isInteger(position)) {
    return false;
  }

  if (groupCode === "FWC") {
    return position >= 0 && position < 20;
  }

  return position >= 1 && position <= 20;
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
