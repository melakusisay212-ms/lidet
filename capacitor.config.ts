import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "et.lidet.app",
  appName: "Lidet",
  webDir: "dist",
  backgroundColor: "#261832",
  android: { allowMixedContent: false },
  plugins: {
    LocalNotifications: { smallIcon: "ic_stat_lidet", iconColor: "#7955C9" },
  },
};

export default config;
