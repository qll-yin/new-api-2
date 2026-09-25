package console_setting

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateCustomNavLinksTagColor(t *testing.T) {
	valid := []string{
		`[{"title":"Canvas","url":"/canvas","tag":"NEW"}]`,
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":"#2b2b2b"}]`,
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":"#abc"}]`,
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":" #2B2B2B "}]`,
		`[{"title":"Canvas","url":"https://example.com","tag":"最新","tag_color":"#ff0000"}]`,
	}
	for _, links := range valid {
		require.NoError(t, validateCustomNavLinks(links), links)
	}

	invalid := []string{
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":"red"}]`,
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":"#12345"}]`,
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":"#gggggg"}]`,
		`[{"title":"Canvas","url":"/canvas","tag":"NEW","tag_color":"#fff;background:url(https://example.com/x.png)"}]`,
	}
	for _, links := range invalid {
		require.Error(t, validateCustomNavLinks(links), links)
	}
}
