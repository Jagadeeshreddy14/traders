import React, { useState } from 'react';
import { MapPin, X, Check, Clock, ShieldCheck } from 'lucide-react';

interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onSelectLocation: (loc: string) => void;
}

const CITY_AREAS = [
  { name: 'City Center / Main Road', eta: '25-35 mins', active: true },
  { name: 'Green Valley / Sector 4', eta: '30-40 mins', active: true },
  { name: 'East Heights / Ring Road', eta: '30-45 mins', active: true },
  { name: 'South Park / Avenue 7', eta: '35-45 mins', active: true },
  { name: 'North Lake / Old Town', eta: '35-45 mins', active: true },
  { name: 'Industrial Zone / West End', eta: '40-50 mins', active: true },
];

export const DeliveryLocationModal: React.FC<DeliveryLocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [selected, setSelected] = useState(currentLocation);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectLocation(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Select Delivery Area</h3>
            <p className="text-xs text-slate-500">Paven Traders Single Store City-Wide Coverage</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 mb-5 flex items-start space-x-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
            We deliver across the entire city from our flagship grocery store hub. Orders are packaged in temperature-controlled bags.
          </p>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {CITY_AREAS.map((area) => (
            <div
              key={area.name}
              onClick={() => setSelected(area.name)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                selected === area.name
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selected === area.name
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {selected === area.name && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{area.name}</p>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                    <Clock className="w-3 h-3 text-brand-600" />
                    <span>Est. Delivery: {area.eta}</span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Active Zone
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};
