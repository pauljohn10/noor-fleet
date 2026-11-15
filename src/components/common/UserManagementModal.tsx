import React from 'react';
import { Modal } from './Modal';
import { UserManagementView } from '../admin/UserManagementView';
import { useI18n } from '../../context/I18nContext';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('Corporate User & Role Management')}
      subtitle={t('Super Admin governance console: provision corporate staff, enforce 3-role RBAC, manage credentials, and audit user logins.')}
      maxWidth="5xl"
    >
      <div className="py-2">
        <UserManagementView />
      </div>
    </Modal>
  );
};
