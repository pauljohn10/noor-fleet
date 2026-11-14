import React from 'react';
import { Modal } from './Modal';
import { UserManagementView } from '../admin/UserManagementView';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Corporate User & Role Management"
      subtitle="Super Admin governance console: provision corporate staff, enforce 3-role RBAC, manage credentials, and audit user logins."
      maxWidth="5xl"
    >
      <div className="py-2">
        <UserManagementView />
      </div>
    </Modal>
  );
};
