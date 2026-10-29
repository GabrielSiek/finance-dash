import { ICON } from '@/lib/icons';
import { SearchBox, SearchInput, SrOnly } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface SearchFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Stretch to fill a flex row instead of the fixed 240px. */
  grow?: boolean;
}

export function SearchField({ label, placeholder, value, onChange, grow }: SearchFieldProps) {
  return (
    <SearchBox $grow={grow}>
      <Icon d={ICON.search} />
      <SrOnly>{label}</SrOnly>
      <SearchInput placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </SearchBox>
  );
}
