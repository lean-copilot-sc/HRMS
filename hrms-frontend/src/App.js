import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeAdd from './pages/EmployeeAdd';
import EmployeeEdit from './pages/EmployeeEdit';
import Attendance from './pages/Attendance';
import AttendanceReport from './pages/AttendanceReport';
import Leave from './pages/Leave';
import LeaveApproval from './pages/LeaveApproval';
import Departments from './pages/Departments';
import Holidays from './pages/Holidays';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Layout from './layouts/MainLayout';
import SalarySlipList from './modules/salary-slip/ListPage';
import SalarySlipCreate from './modules/salary-slip/CreatePage';
import SalarySlipDetail from './modules/salary-slip/DetailPage';
import SalarySlipEdit from './modules/salary-slip/EditPage';
import SendSalarySlipPage from './modules/payroll/SendSalarySlipPage';

const PrivateRoute = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
      
      <Route element={<Layout />}>
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/employees" 
          element={
            <PrivateRoute roles={['admin', 'hr']}>
              <Employees />
            </PrivateRoute>
          } 
        />

        <Route
          path="/salary-slip"
          element={
            <PrivateRoute roles={['admin']}>
              <SalarySlipList />
            </PrivateRoute>
          }
        />

        <Route
          path="/salary-slip/create"
          element={
            <PrivateRoute roles={['admin']}>
              <SalarySlipCreate />
            </PrivateRoute>
          }
        />

        <Route
          path="/salary-slip/:id"
          element={
            <PrivateRoute roles={['admin']}>
              <SalarySlipDetail />
            </PrivateRoute>
          }
        />

        <Route
          path="/salary-slip/:id/edit"
          element={
            <PrivateRoute roles={['admin']}>
              <SalarySlipEdit />
            </PrivateRoute>
          }
        />

        <Route
          path="/payroll/send-salary-slip"
          element={
            <PrivateRoute roles={['admin']}>
              <SendSalarySlipPage />
            </PrivateRoute>
          }
        />
        
        <Route 
          path="/employees/add" 
          element={
            <PrivateRoute roles={['admin', 'hr']}>
              <EmployeeAdd />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/employees/edit/:id" 
          element={
            <PrivateRoute roles={['admin', 'hr']}>
              <EmployeeEdit />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/attendance" 
          element={
            <PrivateRoute>
              <Attendance />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/attendance/report" 
          element={
            <PrivateRoute roles={['admin', 'hr']}>
              <AttendanceReport />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/leave" 
          element={
            <PrivateRoute>
              <Leave />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/departments" 
          element={
            <PrivateRoute roles={['admin', 'hr']}>
              <Departments />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/holidays" 
          element={
            <PrivateRoute>
              <Holidays />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <PrivateRoute roles={['admin']}>
              <Settings />
            </PrivateRoute>
          } 
        />
        </Route>

        {/* Public route for email-based leave approval */}
        <Route path="/leave/approve" element={<LeaveApproval />} />
      
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}

export default App;
