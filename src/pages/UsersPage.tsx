import DashboardLayout from '@/components/layout/DashboardLayout';
import { UserManagement } from '@/components/auth/UserManagement';

const UsersPage = () => {
  return (
    <DashboardLayout>
      <UserManagement />
    </DashboardLayout>
  );
};

export default UsersPage;



