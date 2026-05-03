package models

type Item struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Brand       string     `json:"brand"`
	Category    string     `json:"category"`
	Condition   string     `json:"condition"`
	Type        string     `json:"type"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	PostStatus  string     `json:"postStatus"`
	Quantity    int        `json:"quantity"`
	Featured    bool       `json:"featured"`
	Price       *float64   `json:"price"`
	Dimensions  Dimensions `json:"dimensions"`
	Date        *string    `json:"date"`
	Images      []string   `json:"images"`
	Tags        []string   `json:"tags"`
	UpdatedAt   string     `json:"updatedAt"`
	CreatedAt   string     `json:"createdAt"`
}

type Dimensions struct {
	Width  *float64 `json:"width"`
	Depth  *float64 `json:"depth"`
	Height *float64 `json:"height"`
	Weight *float64 `json:"weight"`
}

type CreateItemInput struct {
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Brand       string     `json:"brand"`
	Category    string     `json:"category"`
	Condition   string     `json:"condition"`
	Type        string     `json:"type"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	PostStatus  string     `json:"postStatus"`
	Quantity    int        `json:"quantity"`
	Featured    bool       `json:"featured"`
	Price       *float64   `json:"price"`
	Dimensions  Dimensions `json:"dimensions"`
	Date        *string    `json:"date"`
	Images      []string   `json:"images"`
}

type UpdateItemInput = CreateItemInput

type ListFilters struct {
	Status     string
	StatusIn   []string
	Featured   *bool
	Category   string
	Type       string
	QuantityMin *int
	Limit      int
	AdminMode  bool // if true, bypasses post_status filter
}
