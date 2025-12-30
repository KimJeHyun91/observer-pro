import { ReactNode } from 'react';
import { Dialog } from '@/components/ui';

type Props = {
  show: boolean;
  width: number;
  height?: number;
  title: string;
  SOP?: boolean;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  contentBoxClassName?: string;
  children: ReactNode;
  close: () => void;
};

export default function CustomModal({
  show,
  width,
  height,
  title,
  children,
  SOP,
  className,
  contentClassName,
  titleClassName,
  contentBoxClassName,
  close,
}: Props) {
  if (SOP) {
    return (
      <Dialog
        isOpen={show}
        width={width}
        contentClassName={contentClassName}
        height={height}
        closable={false}
        onClose={close}
      >
        <div className='max-h-[48.75rem] flex flex-col p-0'>
          <h5 className='text-[#4E4A4A] text-xl font-bold pl-4 py-2'>{title}</h5>
          <div className='w-full bg-[#EDF0F6] h-[2px] border-[1px] border-[#D9DCE3]' />
          {children}
        </div>
      </Dialog>
    );
  } else {
    return (
      <Dialog
        isOpen={show}
        width={width}
        height={height}
        contentClassName={contentClassName}
        className={className}
        closable={true}
        onClose={close}
      >
        <div className={contentBoxClassName}>
          <h5 className={titleClassName}>{title}</h5>
          {children}
        </div>
      </Dialog>
    );
  }

};