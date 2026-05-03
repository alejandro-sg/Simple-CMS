package secrets

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// Values holds the secrets fetched from AWS Secrets Manager.
type Values struct {
	AdminPasswordHash string `json:"ADMIN_PASSWORD_HASH"`
	SessionSecret     string `json:"SESSION_SECRET"`
	RevalidateSecret  string `json:"REVALIDATE_SECRET"`
}

// Load fetches the named secret from AWS Secrets Manager and returns the parsed values.
// accessKeyID and secretAccessKey are the IAM credentials used to authenticate.
func Load(secretName, region, accessKeyID, secretAccessKey string) (*Values, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	svc := secretsmanager.NewFromConfig(cfg)
	result, err := svc.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId:     aws.String(secretName),
		VersionStage: aws.String("AWSCURRENT"),
	})
	if err != nil {
		return nil, fmt.Errorf("get secret %q: %w", secretName, err)
	}

	var v Values
	if err := json.Unmarshal([]byte(*result.SecretString), &v); err != nil {
		return nil, fmt.Errorf("parse secret: %w", err)
	}
	return &v, nil
}
