Here is a **clean, professionally formatted HRMS Requirements File** written exactly in the style expected by **GitHub Copilot Agents** and other AI “project builders.”

You can copy this and upload it as your **requirements.md** file for the Agent.

---

# 📄 **HRMS Requirements Specification (requirements.md)**

### *Human Resource Management System – Full Project Definition*

### *Tech Stack: ReactJS + NodeJS (AWS Lambda) + MongoDB + Knex + Material UI*

---

## **1. Project Overview**

The Human Resource Management System (HRMS) is a full-stack application designed to manage employee data, attendance, leave, holidays, roles, departments, and optional payroll. The system must support role-based access for Admin, HR, and Employees.

The final solution must be scalable, serverless, component-based, secure, and mobile-responsive.

---

## **2. Technology Requirements**

### **Frontend**

* React.js (latest)
* Material UI (MUI v5)
* React Router (latest)
* Axios for API communication
* JWT authentication handling
* Context API or Redux Toolkit (Copilot may choose)
* Form validation using Yup or custom validators

### **Backend**

* Node.js (latest runtime)
* AWS Lambda (serverless functions)
* Serverless Framework structure
* MongoDB (primary database)
* Mongoose for schema definitions
* Knex.js for any SQL-like querying utilities (non-ORM purpose)
* JWT-based auth
* AWS S3 for file upload storage (profile images, documents)
* AWS SES for email notifications
* Modular folder structure with separation of models, controllers, services, middleware, and utilities

### **Database**

* MongoDB Cluster
* Collections:

  * users
  * employees
  * departments
  * attendance
  * leaves
  * holidays

---

## **3. Core Modules**

### **3.1 Authentication**

* Login using email and password
* Forgot password (email OTP or link)
* JWT-based authentication
* Secure password hashing
* Role-based access: admin, hr, employee

---

### **3.2 Dashboard**

* Different dashboard views for:

  * Admin / HR
  * Employee
* Metrics include:

  * Total employees
  * Current day attendance summary
  * Pending leave requests
  * Leave balance
  * Upcoming holidays
  * Recent activity

---

### **3.3 Employee Management**

* Add new employee
* Edit employee
* Delete employee
* Upload profile photo
* View full employee profile
* Assign role, department, designation
* Track joining date, salary, status
* Export employee list

---

### **3.4 Attendance Management**

* Employee clock-in / clock-out
* Track working hours per day
* Monthly attendance report
* Admin/HR manual attendance override
* Export attendance (CSV/Excel)

---

### **3.5 Leave Management**

* Leave types (sick, casual, earned, unpaid)
* Apply leave (with date and reason)
* View leave history
* Approve/Reject leave requests (Admin/HR)
* Auto calculation of leave balance
* Notifications via email & UI

---

### **3.6 Departments & Designations**

* Create / Edit / Delete departments
* Add designations inside departments
* Assign employees to departments
* Department-level statistics view

---

### **3.7 Holiday Calendar**

* Admin can add/edit holiday list
* Holiday calendar view
* Differentiate national & company holidays
* Automatic upcoming holiday display

---

### **3.8 Payroll (Optional - Phase 2)**

* Assign salary
* Monthly salary breakup
* Generate payslips
* Send payslips via email
* Store payslip history

---

### **3.9 Notifications**

* Email notifications using AWS SES:

  * Leave request received
  * Leave approval/rejection
  * Payslip generation
* In-app notifications using MUI Snackbar or Toast

---

### **3.10 Reports & Exports**

* Employee export (CSV/Excel)
* Attendance export
* Leave export
* Filterable reports by:

  * Date
  * Employee
  * Department

---

## **4. Required API Endpoints (AWS Lambda)**

### **4.1 Auth**

* `POST /auth/register`
* `POST /auth/login`
* `POST /auth/forgot-password`
* `POST /auth/reset-password`

---

### **4.2 Employees**

* `GET /employees`
* `POST /employees`
* `GET /employees/:id`
* `PUT /employees/:id`
* `DELETE /employees/:id`

---

### **4.3 Attendance**

* `POST /attendance/clock-in`
* `POST /attendance/clock-out`
* `GET /attendance/:employeeId`
* `GET /attendance/report`
* `POST /attendance/manual`

---

### **4.4 Leave**

* `POST /leave/request`
* `GET /leave/my-requests`
* `GET /leave/pending`
* `PUT /leave/:id/approve`
* `PUT /leave/:id/reject`

---

### **4.5 Departments**

* `GET /departments`
* `POST /departments`
* `PUT /departments/:id`
* `DELETE /departments/:id`

---

### **4.6 Holidays**

* `GET /holidays`
* `POST /holidays`
* `PUT /holidays/:id`
* `DELETE /holidays/:id`

---

## **5. Database Schema Summary**

### **users**

* id
* name
* email
* password (hashed)
* role (admin/hr/employee)
* profile_image
* created_at

### **employees**

* id
* user_id
* department_id
* designation
* joining_date
* salary
* status

### **attendance**

* id
* employee_id
* date
* clock_in
* clock_out
* total_hours

### **leaves**

* id
* employee_id
* leave_type
* from_date
* to_date
* status
* reason
* applied_at

### **departments**

* id
* name
* description

### **holidays**

* id
* date
* name
* type (public/company)

---

## **6. Frontend Pages / Routes**

1. `/login`
2. `/dashboard`
3. `/employees`
4. `/employees/add`
5. `/employees/edit/:id`
6. `/departments`
7. `/attendance`
8. `/leave`
9. `/profile`
10. `/holidays`
11. `/settings`

---

## **7. UI Requirements**

* Responsive, clean Material UI layout
* Sidebar + top navbar
* Reusable components:

  * Table
  * Form wrappers
  * File upload
  * Modal dialogs
  * Date pickers
  * Chart components (optional)
* Dark mode support (optional)

---

## **8. Security Requirements**

* JWT authentication
* Password hashing (bcrypt)
* Role-based authorization middleware
* Input validation for all endpoints
* Secure file upload to S3
* CORS handling
* Rate limiting (optional)

---

## **9. Future Enhancements**

* Mobile app (React Native)
* Slack / WhatsApp integration
* Attendance via geofencing
* Chat module for HR & employees
* Biometric attendance device integration

---

# ✔ This requirements file is ready for GitHub Copilot Agent.

If you want, I can also generate:

✅ Backend folder structure
✅ React folder structure
✅ Mongoose models
✅ Serverless.yml template
✅ API controllers
✅ React UI skeleton

Just say **“Generate folder structure”**.
