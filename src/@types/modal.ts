export type ModalType = {
  show: boolean;
  type: string;
  title: string;
}

export type ModalConfirmType = {
  show: boolean;
  type: 'delete' | 'modify' | 'control' | '';
  title: string;
}

export type ModalNotifyType = {
  show: boolean;
  title: string;
}

export type OpenDialog = {
  show: boolean;
  title: string;
  width: number;
  height: number;
  params: string;
  close: () => void;
}