import { LatLng } from 'nepal-administrative-map';

export const cities: { en: string; ne: string; point: LatLng }[] = [
  { en: 'Kathmandu', ne: 'काठमाडौं', point: new LatLng(27.7172, 85.324) },
  { en: 'Pokhara', ne: 'पोखरा', point: new LatLng(28.2096, 83.9856) },
  { en: 'Biratnagar', ne: 'विराटनगर', point: new LatLng(26.4525, 87.2718) },
  { en: 'Birgunj', ne: 'वीरगञ्ज', point: new LatLng(27.0104, 84.8774) },
  { en: 'Nepalgunj', ne: 'नेपालगञ्ज', point: new LatLng(28.05, 81.6167) },
];
