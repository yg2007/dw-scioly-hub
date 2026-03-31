import PropTypes from 'prop-types';
import { C } from '../../ui';

export default function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>{label}</label>
      <input type="text" value={value || ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
          fontSize: 14, fontFamily: "inherit", background: C.white }} />
    </div>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};
