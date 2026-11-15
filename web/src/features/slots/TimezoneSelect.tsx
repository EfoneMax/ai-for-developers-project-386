import { supportedTimeZones } from "./time-zone";

interface TimezoneSelectProps {
  timeZone: string;
  onChange: (timeZone: string) => void;
}

/** Ручной выбор пояса гостя; подпись — идентификатор зоны IANA. */
export default function TimezoneSelect({ timeZone, onChange }: TimezoneSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="guest-time-zone" className="text-sm font-medium text-[#17231d]">
        Часовой пояс
      </label>
      <select
        id="guest-time-zone"
        value={timeZone}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="rounded-xl border border-[#17231d]/15 bg-white/80 px-3 py-2 text-sm text-[#17231d] shadow-none outline-none focus-visible:border-[#2f6b4f] focus-visible:ring-2 focus-visible:ring-[#2f6b4f]/30"
      >
        {supportedTimeZones(timeZone).map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
    </div>
  );
}
