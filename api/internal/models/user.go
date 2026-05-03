package models

const RoleAdmin = "admin"
const RoleUser = "user"

const (
	PermItemsRead   = "items:read"
	PermItemsWrite  = "items:write"
	PermItemsDelete = "items:delete"
	PermItemsImport = "items:import"
	PermReviewsRead     = "reviews:read"
	PermReviewsModerate = "reviews:moderate"
	PermReviewsDelete   = "reviews:delete"
	PermUploadsWrite    = "uploads:write"
	PermContentWrite    = "content:write"
)

var AllGrantablePermissions = []string{
	PermItemsRead,
	PermItemsWrite,
	PermItemsDelete,
	PermItemsImport,
	PermReviewsRead,
	PermReviewsModerate,
	PermReviewsDelete,
	PermUploadsWrite,
	PermContentWrite,
}

type User struct {
	ID          string   `json:"id"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
	CreatedAt   string   `json:"created_at"`
}

type CreateUserInput struct {
	Username    string   `json:"username"`
	Password    string   `json:"password"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}
