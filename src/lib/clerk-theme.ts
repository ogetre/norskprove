import { nbNO } from "@clerk/localizations";

/** Clerk components styled with the site's fjord palette. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#b83a2b",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#12212c",
    colorMutedForeground: "#56646e",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#12212c",
    colorBorder: "#cfdde2",
    colorRing: "#b83a2b",
    colorDanger: "#b83a2b",
    colorSuccess: "#4c7652",
    colorShadow: "rgb(15 43 60 / 0.35)",
    fontFamily: "var(--font-golos), system-ui, sans-serif",
    borderRadius: "0.6rem",
  },
  options: {
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
    logoPlacement: "none" as const,
  },
};

export const clerkLocalization = {
  ...nbNO,
  signIn: {
    ...nbNO.signIn,
    start: {
      ...nbNO.signIn?.start,
      title: "Logg inn",
      subtitle: "Fortsett der du slapp. Fremgangen din venter.",
      titleCombined: "Logg inn",
      subtitleCombined: "Fortsett der du slapp. Fremgangen din venter.",
    },
  },
  signUp: {
    ...nbNO.signUp,
    start: {
      ...nbNO.signUp?.start,
      title: "Opprett konto",
      subtitle: "Gratis. Fremgangen lagres automatisk.",
      titleCombined: "Opprett konto",
      subtitleCombined: "Gratis. Fremgangen lagres automatisk.",
    },
  },
};
