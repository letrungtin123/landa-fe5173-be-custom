// ═══════════════════════════════════════════════════════════════
// @deprecated — Hardcoded badge images (fallback only)
// Badge images are now stored in Supabase Storage and served
// dynamically via API (card_image_url / icon_image_url).
// These static imports are kept as fallback during transition.
// ═══════════════════════════════════════════════════════════════
import ManhGhepHoanHaoCard from "@/assets/badgesCard/ManhGhepHoanHaoCard.png";
import ChienBinhOnboardingCard from "@/assets/badgesCard/ChienBinhOnboardingCard.png";
import NguoiNamGiuGiaTriCard from "@/assets/badgesCard/NguoiNamGiuGiaTriCard.png";
import DaiSuLACard from "@/assets/badgesCard/DaiSuL&ACard.png";
import NguoiButPhaLACard from "@/assets/badgesCard/NguoiButPhaL&ACard.png";
import ChuyenGiaLACard from "@/assets/badgesCard/ChuyenGiaL&ACard.png";
import BacThayTuyenDungCard from "@/assets/badgesCard/BacThayTuyenDungCard.png";
import ChuyenGiaOTIFCard from "@/assets/badgesCard/ChuyenGiaOTIFCard.png";
import DaiSuTinCayCard from "@/assets/badgesCard/DaiSuTinCayCard.png";
import BacThayToanNangCard from "@/assets/badgesCard/BacThayToanNangCard.png";
import HocGiaTocDoCard from "@/assets/badgesCard/HocGiaTocDoCard.png";
import NhaThamHiemHeThongCard from "@/assets/badgesCard/NhaThamHiemHeThongCard.png";
import NguoiDanDauCongNgheCard from "@/assets/badgesCard/NguoiDanDauCongNgheCard.png";

export const BADGE_CARD_IMAGES: Record<string, string> = {
  perfect_profile: ManhGhepHoanHaoCard,
  onboarding_warrior: ChienBinhOnboardingCard,
  value_holder: NguoiNamGiuGiaTriCard,
  la_ambassador: DaiSuLACard,
  la_breakthrough: NguoiButPhaLACard,
  la_expert: ChuyenGiaLACard,
  recruitment_master: BacThayTuyenDungCard,
  otif_expert: ChuyenGiaOTIFCard,
  trusted_ambassador: DaiSuTinCayCard,
  omnipotent_master: BacThayToanNangCard,
  speed_scholar: HocGiaTocDoCard,
  system_explorer: NhaThamHiemHeThongCard,
  first_step: NguoiDanDauCongNgheCard,
};
