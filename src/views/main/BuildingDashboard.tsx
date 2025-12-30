import { useCanvasMapStore } from '@/store/canvasMapStore';
import IndoorAside from './components/IndoorAside';
import buildingDefaultImage from '../../assets/styles/images/BuildingImage.png';
import { useFloors } from '@/utils/hooks/main/useFloors';
import { Floor } from '@/@types/floor';
import { useState, useEffect } from 'react';
import { apiUploadBuildingImage } from '@/services/ObserverService';
import ImageUploadModal from './modals/ImageUploadModal';
import Upload from '@/utils/upload/image';
import DeviceListBuildingDashboard from './components/DeviceListBuildingDashboard';
import EventsByDevice from './components/EventsByDevice';
import EventsByImportanceBuildingDashboard from './components/EventsByImportanceBuildingDashboard';
import EventsByAckBuildingDashboard from './components/EventsByAckBuildingDashboard';
import EventList from './components/EventList';
import EventArchiveBuildingDashboard from './components/EventArchiveBuildingDashboard';
import { EventArchiveProvider } from './context/eventArchiveContext';

type UploadBuildingImageResult = {
  file: File,
  message: 'ok' | 'fail';
}

export type ImageUploadModalType = {
  show: boolean;
  imageURL: string;
  title: string;
}

export default function BuildingDashboard() {
  const { buildingIdx, buildingName, floorIdx, mapImageURL, setCanvasMapState } = useCanvasMapStore();
  const { data } = useFloors(buildingIdx);
  const [, setUploadImageURL] = useState<string>('');
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const floors: Floor[] = data?.result || [];
  const [modal, setModal] = useState<ImageUploadModalType>({
    show: false,
    imageURL: '',
    title: '',
  });

  const handleChangeUploadImage = (image: string, file: File) => {
    setUploadImageURL(image);
    setUploadImage(file);
    toggleModal({
      show: true,
      title: '건물 이미지 변경',
      imageURL: image
    })
  }
  const resetUploadImage = () => {
    setUploadImageURL('');
    setUploadImage(null);
    toggleModal({
      show: false,
      imageURL: '',
      title: ''
    })
  }

  const handleConfirmUpdateImage = async () => {
    try {
      if (!uploadImage) {
        return;
      }
      const formData = new FormData();
      formData.append("idx", `${buildingIdx}`);
      formData.append("map_image_url", uploadImage.name);
      formData.append("buildingplan", uploadImage);
      const result = await apiUploadBuildingImage<UploadBuildingImageResult>(formData);
      if (!result || result.message !== 'ok') {
        return;
      }
      resetUploadImage();
      const current = useCanvasMapStore.getState();
      setCanvasMapState({
        ...current,
        buildingIdx,
        floorIdx,
        mapImageURL: `http://${window.location.hostname}:4200/images/buildingplan/${uploadImage.name}`
      })
    } catch (err) {
      console.error(err);
    }
  }

  const toggleModal = ({ show, imageURL, title }: ImageUploadModalType) => {
    setModal({
      show,
      imageURL,
      title
    });
  };

  useEffect(() => {
    setUploadImageURL('');
    setUploadImage(null);
  }, [mapImageURL]);

  return (
    <section className='w-full flex justify-between h-full'>
      <IndoorAside />
      <main className='w-[1658px] bg-white dark:bg-[#1E1E20] rounded-md py-4 px-2'>
        <div className='flex justify-between'>
          <div className='flex flex-col ml-3 mb-2 text-black'>
            <h4>
              {buildingName}
            </h4>
            <p className='dark:text-[#F5F5F5]'>층수: {floors.length}</p>
          </div>
          <Upload handleChangeUploadImage={handleChangeUploadImage} title='건물' />
        </div>
        <div className='bg-[#B8B8B8] w-full h-[3px]'></div>
        <section className={`flex justify-between pt-2 px-1 h-[calc(100%-60px)]`}>
          <main className='w-[79.3125rem] h-full flex flex-col justify-between'>
            <div className='flex justify-between content-between h-[61%]'>
              <DeviceListBuildingDashboard outsideIdx={buildingIdx} />
              <div className={'w-[62.5rem] h-full bg-[#EBECEF] dark:bg-[#272829] rounded-md overflow-y-hidden'}>
                <img src={mapImageURL || buildingDefaultImage} className='w-full h-full object-fit' />
              </div>
            </div>
            <div className={'flex justify-around h-[38%]'}>
              <EventsByDevice />
              <EventsByImportanceBuildingDashboard />
              <EventsByAckBuildingDashboard />
            </div>
          </main>
          <aside className='h-full flex flex-col justify-between'>
            <EventArchiveProvider>
              <EventArchiveBuildingDashboard />
              <EventList outsideIdx={buildingIdx} />
            </EventArchiveProvider>
          </aside>
        </section>
      </main>
      {modal.show ?
        <ImageUploadModal
          show={modal.show}
          imageURL={modal.imageURL}
          title={modal.title}
          toggle={toggleModal}
          confirm={handleConfirmUpdateImage}
        />
        : ''}
    </section>
  );

}