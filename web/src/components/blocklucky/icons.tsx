import type { IconBaseProps, IconType } from 'react-icons';
import {
  MdArrowDownward, MdArrowForward, MdNorthEast, MdCheck, MdKeyboardArrowDown,
  MdOutlineHelpOutline, MdOutlinePaid, MdOpenInNew, MdFingerprint,
  MdLanguage, MdOutlineDashboard, MdAutorenew, MdSensors,
  MdOutlineVerifiedUser, MdAutoAwesome, MdOutlineConfirmationNumber,
  MdOutlineEmojiEvents, MdOutlineGroups, MdOutlineAccountBalanceWallet,
  MdBolt, MdClose,
} from 'react-icons/md';

type MaterialIconProps = IconBaseProps & { strokeWidth?: number };

function materialIcon(Icon: IconType) {
  return function MaterialIcon({ size = 24, strokeWidth: _strokeWidth, ...props }: MaterialIconProps) {
    return <Icon size={size} aria-hidden="true" focusable="false" {...props} stroke="none" />;
  };
}

export const ArrowDown = materialIcon(MdArrowDownward);
export const ArrowRight = materialIcon(MdArrowForward);
export const ArrowUpRight = materialIcon(MdNorthEast);
export const Check = materialIcon(MdCheck);
export const ChevronDown = materialIcon(MdKeyboardArrowDown);
export const CircleHelp = materialIcon(MdOutlineHelpOutline);
export const Coins = materialIcon(MdOutlinePaid);
export const ExternalLink = materialIcon(MdOpenInNew);
export const Fingerprint = materialIcon(MdFingerprint);
export const Globe2 = materialIcon(MdLanguage);
export const LayoutDashboard = materialIcon(MdOutlineDashboard);
export const LoaderCircle = materialIcon(MdAutorenew);
export const Radio = materialIcon(MdSensors);
export const ShieldCheck = materialIcon(MdOutlineVerifiedUser);
export const Sparkles = materialIcon(MdAutoAwesome);
export const Ticket = materialIcon(MdOutlineConfirmationNumber);
export const Trophy = materialIcon(MdOutlineEmojiEvents);
export const Users = materialIcon(MdOutlineGroups);
export const Wallet = materialIcon(MdOutlineAccountBalanceWallet);
export const Zap = materialIcon(MdBolt);
export const X = materialIcon(MdClose);