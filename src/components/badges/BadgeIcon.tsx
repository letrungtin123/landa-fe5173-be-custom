import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BadgeTier } from "@/data/badgeConfig";
import ManhGhepHoanHaoIcon from "@/assets/badges/ManhGhepHoanHao.png";
import ChienBinhOnboardingIcon from "@/assets/badges/ChienBinhOnboarding.png";
import HocGiaTocDoIcon from "@/assets/badges/HocGiaTocDo.png";
import NguoiNamGiuGiaTriIcon from "@/assets/badges/NguoiNamGiuGiaTri.png";
import NguoiButPhaLAIcon from "@/assets/badges/NguoiButPhaL&A.png";
import ChuyenGiaLAIcon from "@/assets/badges/ChuyenGiaL&A.png";
import NguoiDanDauCongNgheIcon from "@/assets/badges/NguoiDanDauCongNghe.png";
import DaiSuLAIcon from "@/assets/badges/DaiSuL&A.png";
import NhaThamHiemHeThongIcon from "@/assets/badges/NhaThamHiemHeThong.png";
import BacThayTuyenDungIcon from "@/assets/badges/BacThayTuyenDung.png";
import ChuyenGiaOTIFIcon from "@/assets/badges/ChuyenGiaOTIF.png";
import DaiSuTinCayIcon from "@/assets/badges/DaiSuTinCay.png";

interface BadgeIconProps {
  badgeId: string;
  tier: BadgeTier;
  earned: boolean;
  size?: number;
  className?: string;
}

const BADGE_IMAGE_MAP: Record<string, { src: string; alt: string }> = {
  perfect_profile: { src: ManhGhepHoanHaoIcon, alt: "Mảnh Ghép Hoàn Hảo" },
  onboarding_warrior: { src: ChienBinhOnboardingIcon, alt: "Chiến Binh Onboarding" },
  speed_scholar: { src: HocGiaTocDoIcon, alt: "Học Giả Tốc Độ" },
  value_holder: { src: NguoiNamGiuGiaTriIcon, alt: "Người Nắm Giữ Giá Trị" },
  la_breakthrough: { src: NguoiButPhaLAIcon, alt: "Người Bức Phá L&A" },
  la_expert: { src: ChuyenGiaLAIcon, alt: "Chuyên Gia L&A" },
  first_step: { src: NguoiDanDauCongNgheIcon, alt: "Người Dẫn Đầu Công Nghệ" },
  la_ambassador: { src: DaiSuLAIcon, alt: "Đại Sứ L&A" },
  system_explorer: { src: NhaThamHiemHeThongIcon, alt: "Nhà Thám Hiểm Hệ Thống" },
  recruitment_master: { src: BacThayTuyenDungIcon, alt: "Bậc Thầy Tuyển Dụng" },
  otif_expert: { src: ChuyenGiaOTIFIcon, alt: "Chuyên Gia OTIF" },
  trusted_ambassador: { src: DaiSuTinCayIcon, alt: "Đại Sứ Tin Cậy" },
};

export function BadgeIcon({ badgeId, tier, earned, size = 64, className }: BadgeIconProps) {
  const imageInfo = BADGE_IMAGE_MAP[badgeId];
  
  // omnipotent_master không dùng BadgeIcon (nó dùng full-card background)
  if (!imageInfo) return null;

  return (
    <motion.div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      whileHover={earned ? { scale: 1.1 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      <img
        src={imageInfo.src}
        alt={imageInfo.alt}
        className={cn("w-full h-full object-contain drop-shadow-xl", !earned && "grayscale opacity-50")}
      />
      
      {/* Hiệu ứng lấp lánh quét ngang cho ảnh */}
      {earned && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            WebkitMaskImage: `url(${imageInfo.src})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: `url(${imageInfo.src})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        >
          <motion.div
            className="absolute top-[-50%] w-[60%] h-[200%] bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-25deg]"
            animate={{ left: ["-100%", "250%"] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}
