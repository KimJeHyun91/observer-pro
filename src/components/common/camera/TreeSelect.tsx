import { useState, useMemo, useCallback, Children, useEffect } from 'react';
// eslint-disable-next-line import/named
import Select, { components, createFilter, GroupBase, GroupProps, OptionProps, SingleValue } from 'react-select';
import { FaPlusSquare, FaMinusSquare } from "react-icons/fa";
import { CameraType } from '@/@types/camera';

type CameraOption = {
  label: string;
  value: string;
};

type TreeSelectProps = {
  cameraList: CameraType[];
  handleChangeCurrentCamera: (option: SingleValue<CameraOption>) => void;
  isServiceType?: string
  setSelectedCameraData?: (d: CameraType | undefined | null) => void
  handleSelectedCameraIp?: (ip: string) => void;
  placeholder?: string;
  customMenuStyle?: string;
  camera?: string | null;
};

type GroupHeadersProps = {
  isExpanded: boolean;
  toggleGroup: (label: string) => void;
  label: string;
};

const headerToggleButtonStyle = 'relative flex items-center p-0 m-0';

const GroupHeaders = ({ isExpanded, toggleGroup, label }: GroupHeadersProps) => (
  <div
    style={{
      cursor: 'pointer',
      fontWeight: 'bold',
      position: 'relative',
      marginRight: '10px',
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
    onClick={() => toggleGroup(label)}
  >
    {isExpanded ? (
      <FaMinusSquare className={headerToggleButtonStyle} />
    ) : (
      <FaPlusSquare className={headerToggleButtonStyle} />
    )}
  </div>
);

export default function TreeSelect({
  cameraList,
  handleChangeCurrentCamera,
  isServiceType,
  setSelectedCameraData,
  handleSelectedCameraIp,
  customMenuStyle,
  initialCameraValue,
  placeholder,
  camera
}: TreeSelectProps & { initialCameraValue?: string }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<SingleValue<CameraOption>>(null);

  const toggleGroup = useCallback((label: string) => {
    setExpandedGroups(current => ({
      ...current,
      [label]: !current[label],
    }));
  }, []);

  const options: GroupBase<CameraOption>[] = useMemo(() => {
    return cameraList?.reduce<GroupBase<CameraOption>[]>((acc, camera) => {
      let group = acc.find(g => g.vms_name === camera.vms_name);
      if (!group) {
        group = { label: camera.service_type === 'independent' ? '개별 카메라' : camera.vms_name, vms_name: camera.vms_name, options: [] };
        acc.push(group);
      }
      group = {
        label: camera.service_type === 'independent' ? '개별 카메라' : camera.vms_name,
        vms_name: camera.vms_name,
        options: [...group.options, {
          label: camera.service_type === 'independent' ? `${camera.camera_name} (${camera.camera_ip})` : `${camera.camera_id}.${camera.camera_name} (${camera.vms_name})`,
          value: `${camera.main_service_name}:${camera.vms_name}:${camera.camera_id}:${camera.service_type}`,
        }],
      };
      return acc.map(g => (g.label === group.label ? group : g));
    }, []);
  }, [cameraList]);

  const filterOption = createFilter({ ignoreAccents: false });

  const handleInputChange = useCallback(
    (inputValue: string, { action }: { action: string }) => {
      if (action === 'input-change') {
        const newExpandedGroups: Record<string, boolean> = {};
        options.forEach(option => {
          const isGroupMatched = option.options.some(subOption =>
            filterOption(
              { label: subOption.label, value: subOption.value, data: subOption },
              inputValue
            )
          );
          if (isGroupMatched) {
            newExpandedGroups[option.label! as string] = true;
          }
        });
        setExpandedGroups(newExpandedGroups);
      }
    },
    [options, filterOption]
  );

  useEffect(() => {
    if (initialCameraValue && cameraList.length > 0) {
      const matchedCamera = cameraList.find(camera => {
        const format1 = `${camera.main_service_name}:${camera.vms_name}:${camera.camera_id}:${camera.service_type}`;
        const format2 = `${camera.main_service_name}:${camera.vms_name}:${camera.camera_id}`;
        const format3 = `${camera.main_service_name}::${camera.camera_id}`;

        return (
          format1 === initialCameraValue ||
          format2 === initialCameraValue ||
          format3 === initialCameraValue
        );
      });

      if (matchedCamera) {
        const matchedOption = {
          label: matchedCamera.service_type === 'independent'
            ? `${matchedCamera.camera_name} (${matchedCamera.camera_ip})`
            : `${matchedCamera.camera_id}.${matchedCamera.camera_name} (${matchedCamera.vms_name})`,
          value: `${matchedCamera.main_service_name}:${matchedCamera.vms_name}:${matchedCamera.camera_id}:${matchedCamera.service_type}`,
        };
        setSelectedOption(matchedOption);
      } else {
        console.log('No match found for:', initialCameraValue);
        setSelectedOption(null);
      }
    } else if (!initialCameraValue) {
      setSelectedOption(null);
    }
  }, [initialCameraValue, cameraList]);

  const customComponents = {
    Option: (props: OptionProps<CameraOption, false, GroupBase<CameraOption>>) => <components.Option {...props} />,
    Group: ({ children, ...props }: GroupProps<CameraOption, false, GroupBase<CameraOption>>) => (
      <div className="group-container">
        <components.Group {...props} className='flex justify-between w-full pb-0'>
          <GroupHeaders
            label={props.data.label! as string}
            isExpanded={!!expandedGroups[props.data.label! as string]}
            toggleGroup={toggleGroup}
          />
        </components.Group>
        {expandedGroups[props.data.label! as string] && (
          <ul className='list-none pl-4 mt-2'>
            {Children.map(children, (child) => (
              <li className='mb-1'>
                {child}
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
  };

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#f5f5f5',
      boxShadow: state.isFocused ? '0 0 0 2px #2a85ff' : 'none',
      border: 'none',
      padding: '5px',
      borderRadius: '15px',
      width: customMenuStyle || 'auto',
    }),
  };

  return (
    <Select
      isClearable
      styles={customMenuStyle ? customStyles : isServiceType === 'broadcast' ? customStyles : undefined}
      options={options}
      value={camera == null ? null : selectedOption}
      components={customComponents}
      placeholder={placeholder || '카메라를 선택하세요.'}
      onInputChange={handleInputChange}
      onChange={(option) => {
        if (!option) {
          if (isServiceType === 'broadcast' && setSelectedCameraData) {
            setSelectedCameraData(null);
          }

          if (isServiceType === 'inundation' && handleSelectedCameraIp) {
            handleSelectedCameraIp('');
          }

          setSelectedOption(null);
          handleChangeCurrentCamera(null);
          return;
        }

        const cameraId = option.value.split(':')[2];

        if (isServiceType === 'broadcast' && cameraList && setSelectedCameraData) {
          setSelectedCameraData(cameraList.find(item => item.camera_id === cameraId));
        }

        if (isServiceType === 'inundation' && cameraList && handleSelectedCameraIp) {
          const selectedCamera = cameraList.find(item => item.camera_id === cameraId);
          if (selectedCamera) {
            if (selectedCamera.main_service_name === 'inundation') {
              const cameraIdentifier = `${selectedCamera.camera_id}:${selectedCamera.vms_name}:${selectedCamera.main_service_name}:${selectedCamera.camera_ip}`;
              handleSelectedCameraIp(cameraIdentifier);
            } else {
              handleSelectedCameraIp(selectedCamera.camera_ip);
            }
          }
        }
        setSelectedOption(option);
        handleChangeCurrentCamera(option);

      }}
    />
  );
};