import { Sun, Thermometer, CloudRain, Wind, CloudLightning } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WeatherCondition } from "@/models/DailyReport";

const WEATHER_ICONS: Record<WeatherCondition, LucideIcon> = {
  fair: Sun,
  severe_heat: Thermometer,
  severe_rain: CloudRain,
  severe_wind: Wind,
  extreme_weather: CloudLightning,
};

export function WeatherIcon({
  condition,
  className,
}: {
  condition: WeatherCondition;
  className?: string;
}) {
  const Icon = WEATHER_ICONS[condition] ?? Sun;
  return <Icon className={className} />;
}
