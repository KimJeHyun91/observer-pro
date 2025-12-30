import { forwardRef, useRef, useState, useCallback, useEffect } from 'react'
import type { ReactNode, ChangeEvent, MouseEvent } from 'react'
// import classNames from '@/utils/classNames'
import cloneDeep from 'lodash/cloneDeep'
import { Button, Notification, toast } from '@/components/ui'
import { CommonProps } from '@/components/ui/@types/common'
import classNames from '@/components/ui/utils/classNames'
// import { useCanvasMapStore } from '@/store/main/canvasMapStore'

export interface UploadProps extends CommonProps {
  accept?: string
  beforeUpload?: (file: FileList | null, fileList: File[]) => boolean | string
  disabled?: boolean
  draggable?: boolean
  fileList?: File[]
  fileListClass?: string
  fileItemClass?: string
  multiple?: boolean
  onChange?: (file: File[], fileList: File[]) => void
  onFileRemove?: (file: File[]) => void
  showList?: boolean
  tip?: string | ReactNode
  uploadLimit?: number
  handleChangeUploadImage: (image: string, file: File) => void;
  title: '건물' | '층' | '실외';
}

const filesToArray = (files: File[]) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.keys(files).map((key) => files[key as any])

const Upload = forwardRef<HTMLDivElement, UploadProps>((props, ref) => {
  const {
    accept,
    beforeUpload,
    disabled = false,
    draggable = false,
    fileList = [],
    multiple = false,
    onChange,
    // onFileRemove,
    tip,
    uploadLimit = 1,
    children,
    className,
    handleChangeUploadImage,
    title,
    ...rest
  } = props
  const fileInputField = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState(fileList)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (JSON.stringify(files) !== JSON.stringify(fileList)) {
      setFiles(fileList)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(fileList)])

  const triggerMessage = (msg: string | ReactNode = '') => {
    toast.push(
      <Notification type="danger" duration={2000}>
        {msg || 'Upload Failed!'}
      </Notification>,
      {
        placement: 'top-center',
      },
    )
  }

  const pushFile = (newFiles: FileList | null, file: File[]) => {
    if (newFiles) {
      for (const f of newFiles) {
        file.push(f)
      }
    }

    return file
  }

  const addNewFiles = (newFiles: FileList | null) => {
    let file = cloneDeep(files)
    if (typeof uploadLimit === 'number' && uploadLimit !== 0) {
      if (Object.keys(file).length >= uploadLimit) {
        if (uploadLimit === 1) {
          file.shift()
          file = pushFile(newFiles, file)
        }

        return filesToArray({ ...file })
      }
    }
    file = pushFile(newFiles, file)
    return filesToArray({ ...file })
  }

  const onNewFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const { files: newFile } = e.target
    let result: boolean | string = true;
    if (title === '실외' && (!newFile || newFile[0].type !== 'image/png')) {
      return;
    };

    if (beforeUpload) {
      result = beforeUpload(newFile, files)

      if (result === false) {
        triggerMessage()
        return
      }

      if (typeof result === 'string' && result.length > 0) {
        triggerMessage(result)
        return
      }
    }

    if (result) {
      const updatedFile = addNewFiles(newFile)
      setFiles(updatedFile)
      onChange?.(updatedFile, files)
      fileReader.readAsDataURL(updatedFile[0]);
      fileReader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result == null || newFile == null) {
          return;
        }
        handleChangeUploadImage(e.target.result! as string, updatedFile[0]);
      }
    }
  }

  const triggerUpload = (e: MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      fileInputField.current?.click()
    }
    e.stopPropagation()
  }

  const renderChildren = () => {
    if (!draggable && !children) {
      return (
        <Button
          variant={'default'}
          className='w-[7.9rem] h-[1.5rem] flex items-center justify-center rounded-md bg-[#EFEFF1] text-[#8F97A4]'
          onClick={(e) => e.preventDefault()}
        >
          {title} 이미지 변경
        </Button>
      )
    }

    if (draggable && !children) {
      return <span>Choose a file or drag and drop here</span>
    }

    return children
  }

  const handleDragLeave = useCallback(() => {
    if (draggable) {
      setDragOver(false)
    }
  }, [draggable])

  const handleDragOver = useCallback(() => {
    if (draggable && !disabled) {
      setDragOver(true)
    }
  }, [draggable, disabled])

  const handleDrop = useCallback(() => {
    if (draggable) {
      setDragOver(false)
    }
  }, [draggable])

  const draggableProp = {
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  }

  const draggableEventFeedbackClass = `border-primary`

  const uploadClass = classNames(
    'upload',
    draggable && `upload-draggable`,
    draggable && !disabled && `hover:${draggableEventFeedbackClass}`,
    draggable && disabled && 'disabled',
    dragOver && draggableEventFeedbackClass,
    className,
  )

  const uploadInputClass = classNames(
    'upload-input',
    draggable && `draggable`,
  )

  return (
    <>
      <div
        ref={ref}
        className={uploadClass}
        {...(draggable ? draggableProp : { onClick: triggerUpload })}
        {...rest}
      >
        <input
          ref={fileInputField}
          className={uploadInputClass}
          type="file"
          disabled={disabled}
          multiple={multiple}
          accept={accept}
          title=""
          value=""
          onChange={onNewFileUpload}
          {...rest}
        ></input>
        {renderChildren()}
      </div>
      {tip}
    </>
  )
})

Upload.displayName = 'Upload'

export default Upload
