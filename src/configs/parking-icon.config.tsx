
import { IconType } from 'react-icons'; 
import { IoSearch, IoCloseCircleOutline } from "react-icons/io5";
import { MdElectricCar } from "react-icons/md";
import { FaCar, FaTrashCan, FaCircleExclamation } from "react-icons/fa6";
import { LuCar } from "react-icons/lu";
import { FaWheelchair, FaRegEdit } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { GoIssueClosed } from "react-icons/go";
import { IoMdRefresh } from "react-icons/io";
import { CgArrowBottomLeftR, CgArrowTopRightR  } from "react-icons/cg";

export type ParkingIcons = Record<string, IconType>;

const parkingIcon: ParkingIcons = {
    generalCar: FaCar,
    compactCar: LuCar,
	disabledCar: FaWheelchair,
	electricCar: MdElectricCar,
    searchIcon: IoSearch,
    parkingMarker: HiOutlineLocationMarker,
    close: IoCloseCircleOutline,
    trash: FaTrashCan,
    edit: FaRegEdit,
    check: GoIssueClosed,
    exclamation : FaCircleExclamation,
    refresh : IoMdRefresh,
    arrowLeftSquare : CgArrowBottomLeftR,
    arrowRightSquare : CgArrowTopRightR,
};

export default parkingIcon;
