type Props = {
  label: string;
  value: string;
  active: boolean;
  onClick: (value: string) => void;
}

const menuItemsStyle = 'w-[6.5rem] h-[1.6rem] flex justify-center p-3 text-center items-align space-between cursor-pointer rounded-md dark:bg-gray-600 dark:text-white';

export default function MenuItem({ label, value, active, onClick }: Props) {

  return (
    <div
      className={
        active ?
          `bg-active-menu_bg text-active-menu items-center text-center ${menuItemsStyle}`
          :
          `bg-inactive-menu_bg text-inactive-menu items-center text-center ${menuItemsStyle}`}
      onClick={() => onClick(value)}
    >
      {label}
    </div>
  );
}