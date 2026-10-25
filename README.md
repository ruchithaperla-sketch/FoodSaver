
## 📌 About the Project

FoodSaver is a web application designed to make surplus food donation easier and more organized. It provides dedicated interfaces for donors, NGOs, volunteers, and administrators to support the food donation and distribution process.

The platform allows donors to list surplus food, helps NGOs access donation information, provides volunteers with a dedicated dashboard, and gives administrators a separate interface for managing platform activities.

**The goal:** Reduce avoidable food waste and help surplus food reach people who need it.

## ✨ Key Features

- **Role-based access:** Dedicated dashboards for Donors, NGOs, Volunteers, and Administrators.
- **User authentication:** Registration, login, session handling, and role-based dashboard access using Firebase Authentication.
- **Food donation management:** Submit surplus food details, including food name, quantity, category, expiry time, and pickup information.
- **Donation history:** Donors can view their listed donations and associated statuses.
- **NGO dashboard:** Access donation information and support the coordination of food collection.
- **Volunteer dashboard:** Dedicated interface for volunteers participating in food collection and distribution.
- **Admin dashboard:** Separate interface for platform administration.
- **Cloud data storage:** Firebase Cloud Firestore stores application data.
- **Responsive interface:** Web pages styled with CSS and Bootstrap components.

## 👥 User Roles and Responsibilities

### 1. 🍲 Donor

The donor is the person or organization offering surplus food.

**Main responsibilities:**
- Register and log in to the platform.
- Submit surplus food for donation.
- Provide food details, quantity, category, expiry time, and pickup location.
- View previously listed donations and their statuses.
- Log out securely through the application interface.

**Purpose:** Make surplus food available for collection instead of letting it go to waste.

### 2. 🏢 NGO

The NGO represents an organization that can coordinate the collection and distribution of donated food.

**Main responsibilities:**
- Access the NGO dashboard after authentication.
- View available donation information.
- Review relevant food and pickup details.
- Participate in the donation coordination workflow supported by the application.

**Purpose:** Help connect available food donations with communities that need them.

### 3. 🛵 Volunteer

The volunteer supports the collection and distribution of donated food.

**Main responsibilities:**
- Access the volunteer dashboard.
- View relevant donation and collection information provided by the platform.
- Support food collection and delivery coordination.

**Purpose:** Help bridge the gap between food donors and recipient organizations.

### 4. 🛡️ Administrator

The administrator uses a dedicated dashboard to oversee platform activities.

**Main responsibilities:**
- Access the administration interface.
- Review relevant platform information.
- Support the management of donation-related activities.

**Purpose:** Provide a centralized interface for platform administration.

*Note: The exact actions available to each role depend on the current implementation and Firebase security rules.*

## 🔄 How FoodSaver Works

1. **Register or log in:** Users authenticate and access the dashboard associated with their assigned role.
2. **List surplus food:** A donor submits the details of food available for donation.
3. **Store donation information:** The application saves donation data in Firebase Cloud Firestore.
4. **Coordinate collection:** NGOs and volunteers use their respective interfaces to participate in the donation workflow.
5. **Track donation status:** The donor dashboard displays donation records and their associated statuses.

The precise collection, assignment, and delivery workflow depends on the actions implemented in each dashboard.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure of web pages |
| CSS3 | Styling and layout |
| JavaScript (ES6+) | Client-side functionality |
| Bootstrap | UI components and responsive layouts |
| Firebase Authentication | User registration and login |
| Cloud Firestore | Application data storage |
| Firebase Storage | File and image storage integration |
| Git and GitHub | Version control and source code hosting |
| Netlify | Website deployment and hosting |


## 🚀 Live Deployment

Explore the deployed application:

**[https://foodsaver-food-donation.netlify.app/](https://foodsaver-food-donation.netlify.app/)**



