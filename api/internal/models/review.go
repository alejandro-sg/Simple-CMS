package models

type Review struct {
	ID        string `json:"id"`
	Rating    int    `json:"rating"`
	Feedback  string `json:"feedback"`
	Type      string `json:"type"`
	Name      string `json:"name"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type CreateReviewInput struct {
	Rating   int    `json:"rating"`
	Feedback string `json:"feedback"`
	Type     string `json:"type"`
	Name     string `json:"name"`
}
