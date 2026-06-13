import iconHouse from "@/assets/icons/iso-house.png";
import iconKey from "@/assets/icons/iso-key.png";
import iconHmo from "@/assets/icons/iso-hmo.png";
import iconCommercial from "@/assets/icons/iso-commercial.png";
import iconShield from "@/assets/icons/iso-shield.png";
import iconGas from "@/assets/icons/iso-gas.png";
import iconEicr from "@/assets/icons/iso-eicr.png";
import iconEpc from "@/assets/icons/iso-epc.png";
import iconTenants from "@/assets/icons/iso-tenants.png";
import iconAgent from "@/assets/icons/iso-agent.png";
import iconChart from "@/assets/icons/iso-chart.png";
import iconWrench from "@/assets/icons/iso-wrench.png";

const map = {
  house: iconHouse,
  key: iconKey,
  hmo: iconHmo,
  commercial: iconCommercial,
  shield: iconShield,
  gas: iconGas,
  eicr: iconEicr,
  epc: iconEpc,
  tenants: iconTenants,
  agent: iconAgent,
  chart: iconChart,
  wrench: iconWrench,
} as const;

export type IsoIconName = keyof typeof map;

export function IsoIcon({
  name,
  size = 64,
  className = "",
  alt,
}: {
  name: IsoIconName;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={map[name]}
      alt={alt ?? name}
      width={size}
      height={size}
      loading="lazy"
      className={`inline-block select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
